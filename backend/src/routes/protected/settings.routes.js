import fs from "fs";
import { SettingsService } from "../../services/settings.service.js";
import { AuditService } from "../../services/audit.service.js";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export default async function settingsRoutes(fastify, opts) {
  fastify.get("/settings/feature-flags", async (req) => SettingsService.getFeatureFlags(req.db));
  fastify.get("/settings", async (req) => SettingsService.getAll(req.db));
  fastify.post("/settings", async (req) => {
    const result = await SettingsService.updateMany(req.db, req.body || {});
    AuditService.log(req.db, { actor_id: req.user?.id, action: "settings.update", entity_type: "settings", changes: req.body, ip: req.ip });
    return result;
  });

  // ── Backup / Restore (admin only) ─────────────────────────────────────────

  fastify.get("/settings/backup", async (req, reply) => {
    if (req.user?.role !== "admin") return reply.code(403).send({ message: "Admin access required" });
    const rows = await req.db.query(
      `SELECT key, value, type, group_name, label, description FROM settings ORDER BY group_name, key`
    );
    const backup = {
      _version:    "1.0",
      _created_at: new Date().toISOString(),
      _app:        "Eagle Eye / AI Vision",
      settings:    rows || [],
    };
    const filename = `settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    reply.header("Content-Type", "application/json");
    AuditService.log(req.db, { actor_id: req.user?.id, action: "settings.backup", entity_type: "settings", ip: req.ip });
    return reply.send(JSON.stringify(backup, null, 2));
  });

  fastify.post("/settings/restore", async (req, reply) => {
    if (req.user?.role !== "admin") return reply.code(403).send({ message: "Admin access required" });
    const { settings } = req.body || {};
    if (!Array.isArray(settings) || settings.length === 0)
      return reply.code(400).send({ message: "Invalid backup file — expected { settings: [...] }" });

    const SKIP_KEYS = new Set(["app_logo_url"]); // don't overwrite logo path via restore
    let restored = 0;
    for (const row of settings) {
      if (!row.key || SKIP_KEYS.has(row.key)) continue;
      const result = await req.db.query(
        `UPDATE settings SET value = $1 WHERE key = $2`,
        [row.value ?? "", row.key]
      );
      if (result?.rowCount > 0 || result?.length >= 0) restored++;
    }
    AuditService.log(req.db, { actor_id: req.user?.id, action: "settings.restore", entity_type: "settings", changes: { count: restored }, ip: req.ip });
    return { restored, message: `${restored} settings restored successfully` };
  });

  fastify.post("/settings/logo", async (req, reply) => {
    return reply.code(403).send({ message: "Logo is locked and cannot be changed." });
  });
}
