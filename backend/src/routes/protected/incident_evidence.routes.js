import fs from "fs";
import path from "path";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export default async function incidentEvidenceRoutes(fastify) {
  // List all incidents (for the "attach to incident" selector in Playback)
  fastify.get("/incidents/list", async (req) => {
    const rows = await req.db.query(
      `SELECT id, incident_number, title, severity, status, created_at
       FROM incidents
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return { data: rows || [] };
  });

  // Upload a snapshot/evidence file to an incident
  fastify.post("/incidents/:id/evidence", async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ message: "No file uploaded" });

      const dir = "/app/files/incidents";
      ensureDir(dir);

      const mime = data.mimetype || "image/jpeg";
      const ext  = mime.split("/")[1]?.split("+")[0] || "jpg";
      const filename = `${req.params.id}_${Date.now()}.${ext}`;
      const fullPath = path.join(dir, filename);
      fs.writeFileSync(fullPath, await data.toBuffer());

      const relativePath = `incidents/${filename}`;
      const rawCameraId = data.fields?.camera_id?.value ?? data.fields?.camera_id;
      const cameraId = Number(rawCameraId) || null;
      const evidenceItem = {
        path: relativePath,
        camera_id: cameraId,
        original_name: data.filename || null,
        mime,
      };

      // Append to evidence_paths JSON array. Older rows may still contain plain strings.
      await req.db.query(
        `UPDATE incidents
         SET evidence_paths = COALESCE(evidence_paths, '[]'::jsonb) || $1::jsonb,
             updated_at     = NOW()
         WHERE id = $2`,
        [JSON.stringify([evidenceItem]), req.params.id]
      );

      return { path: relativePath, filename };
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  // Remove a specific evidence file from an incident
  fastify.post("/incidents/:id/evidence/remove", async (req) => {
    const { path: filePath } = req.body || {};
    if (!filePath) return { ok: false };

    // Remove path from the JSON array
    await req.db.query(
      `UPDATE incidents
       SET evidence_paths = (
         SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
         FROM jsonb_array_elements(COALESCE(evidence_paths, '[]'::jsonb)) AS elem
         WHERE COALESCE(elem->>'path', trim(both '"' from elem::text)) != $1
       ),
       updated_at = NOW()
       WHERE id = $2`,
      [filePath, req.params.id]
    );

    // Delete the actual file
    try {
      const fullPath = `/app/files/${filePath}`;
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {}

    return { ok: true };
  });
}
