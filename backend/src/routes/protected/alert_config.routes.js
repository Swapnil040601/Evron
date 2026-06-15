export default async function alertConfigRoutes(fastify) {
  fastify.get("/alert-configs", async (req) => {
    const rows = await req.db.query(
      `SELECT * FROM alert_configs ORDER BY is_default DESC, created_at ASC`
    );
    return { data: rows || [] };
  });

  fastify.post("/alert-configs", async (req, reply) => {
    const { name } = req.body || {};
    if (!name?.trim()) return reply.code(400).send({ message: "Name is required" });
    const rows = await req.db.query(
      `INSERT INTO alert_configs (name) VALUES ($1) RETURNING *`,
      [name.trim()]
    );
    return { data: rows[0] };
  });

  fastify.post("/alert-configs/:id", async (req, reply) => {
    const {
      name, disk_warning_pct, disk_critical_pct,
      nvr_offline_delay_sec, cam_offline_delay_sec,
      email_enabled, email_nvr_offline, email_nvr_back_online,
      email_disk_warning, email_disk_critical, email_disk_error,
      email_cam_offline, email_cam_online,
    } = req.body || {};

    const rows = await req.db.query(
      `UPDATE alert_configs SET
        name                  = COALESCE($1, name),
        disk_warning_pct      = COALESCE($2, disk_warning_pct),
        disk_critical_pct     = COALESCE($3, disk_critical_pct),
        nvr_offline_delay_sec = COALESCE($4, nvr_offline_delay_sec),
        cam_offline_delay_sec = COALESCE($5, cam_offline_delay_sec),
        email_enabled         = COALESCE($6, email_enabled),
        email_nvr_offline     = COALESCE($7, email_nvr_offline),
        email_nvr_back_online = COALESCE($8, email_nvr_back_online),
        email_disk_warning    = COALESCE($9, email_disk_warning),
        email_disk_critical   = COALESCE($10, email_disk_critical),
        email_disk_error      = COALESCE($11, email_disk_error),
        email_cam_offline     = COALESCE($12, email_cam_offline),
        email_cam_online      = COALESCE($13, email_cam_online)
      WHERE id = $14
      RETURNING *`,
      [
        name ?? null, disk_warning_pct ?? null, disk_critical_pct ?? null,
        nvr_offline_delay_sec ?? null, cam_offline_delay_sec ?? null,
        email_enabled ?? null, email_nvr_offline ?? null, email_nvr_back_online ?? null,
        email_disk_warning ?? null, email_disk_critical ?? null, email_disk_error ?? null,
        email_cam_offline ?? null, email_cam_online ?? null,
        req.params.id,
      ]
    );
    if (!rows?.length) return reply.code(404).send({ message: "Config not found" });
    return { data: rows[0] };
  });

  fastify.post("/alert-configs/:id/delete", async (req, reply) => {
    const rows = await req.db.query(
      `SELECT is_default FROM alert_configs WHERE id = $1`, [req.params.id]
    );
    if (!rows?.length) return reply.code(404).send({ message: "Config not found" });
    if (rows[0].is_default) return reply.code(400).send({ message: "Cannot delete the default configuration" });
    await req.db.query(`DELETE FROM alert_configs WHERE id = $1`, [req.params.id]);
    return { ok: true };
  });
}
