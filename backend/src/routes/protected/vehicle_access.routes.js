export default async function vehicleAccessRoutes(fastify) {
  fastify.get("/vehicle-access/events", async (req) => {
    const { direction, search, limit = 100, offset = 0 } = req.query;
    const clauses = [];
    const vals = [];
    let i = 1;

    if (direction && direction !== "all") {
      clauses.push(`vae.direction = $${i++}`);
      vals.push(direction);
    }

    if (search) {
      clauses.push(`(vae.plate_text ILIKE $${i} OR c.name ILIKE $${i})`);
      vals.push(`%${search}%`);
      i++;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await req.db.query(`
      SELECT
        vae.*,
        c.name AS camera_name,
        c.camera_type
      FROM vehicle_access_events vae
      LEFT JOIN cameras c ON c.id = vae.camera_id
      ${where}
      ORDER BY vae.event_time DESC
      LIMIT $${i} OFFSET $${i + 1}
    `, [...vals, Number(limit), Number(offset)]);

    const countRows = await req.db.query(`SELECT COUNT(*) AS count FROM vehicle_access_events vae LEFT JOIN cameras c ON c.id = vae.camera_id ${where}`, vals);

    return {
      data: rows || [],
      total: Number(countRows?.[0]?.count || 0),
    };
  });
}
