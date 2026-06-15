export default async function maskingRoutes(fastify) {
  // List all active cameras for the camera selector
  fastify.get("/masking/cameras", async (req) => {
    const rows = await req.db.query(
      `SELECT c.id, c.name, c.channel, n.name AS nvr_name
       FROM cameras c
       LEFT JOIN nvrs n ON n.id = c.nvr_id
       WHERE c.status = 'Active'
       ORDER BY c.name`
    );
    return { data: rows || [] };
  });

  // Get all masks for a camera
  fastify.get("/masking/:cameraId/masks", async (req) => {
    const rows = await req.db.query(
      `SELECT id, camera_id, name, type, tool, coordinates, created_at
       FROM camera_masks
       WHERE camera_id = $1
       ORDER BY created_at ASC`,
      [req.params.cameraId]
    );
    return { data: rows || [] };
  });

  // Save a new mask
  fastify.post("/masking/:cameraId/masks", async (req, reply) => {
    const { name, type, tool, coordinates } = req.body || {};
    if (!name || !type || !coordinates) {
      return reply.code(400).send({ message: "name, type, and coordinates are required" });
    }
    const rows = await req.db.query(
      `INSERT INTO camera_masks (camera_id, name, type, tool, coordinates)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, camera_id, name, type, tool, coordinates, created_at`,
      [req.params.cameraId, name, type, tool || "rectangle", JSON.stringify(coordinates)]
    );
    return { data: rows[0] };
  });

  // Delete a mask
  fastify.delete("/masking/masks/:maskId", async (req) => {
    await req.db.query(`DELETE FROM camera_masks WHERE id = $1`, [req.params.maskId]);
    return { ok: true };
  });
}
