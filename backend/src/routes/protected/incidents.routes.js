function incidentNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const rand = String(Math.floor(Math.random()*9000)+1000);
  return `INC-${ymd}-${rand}`;
}

export default async function incidentsRoutes(fastify) {

  // ── Categories ─────────────────────────────────────────────────────────────

  fastify.get("/incidents/categories", async (req) => {
    const rows = await req.db.query("SELECT * FROM incident_categories ORDER BY name");
    return { data: rows || [] };
  });

  fastify.post("/incidents/categories", async (req, reply) => {
    const { name, color = "blue" } = req.body || {};
    if (!name) return reply.code(400).send({ message: "name required" });
    const rows = await req.db.query(
      `INSERT INTO incident_categories (name, color) VALUES ($1,$2)
       ON CONFLICT (name) DO UPDATE SET color=$2 RETURNING *`,
      [name.trim(), color]
    );
    return rows[0];
  });

  // ── Incidents CRUD ─────────────────────────────────────────────────────────

  fastify.get("/incidents", async (req) => {
    const { severity, status, from_date, to_date, search, limit = 50, offset = 0 } = req.query;
    const clauses = [];
    const vals = [];
    let i = 1;
    if (severity)  { clauses.push(`i.severity = $${i++}`);             vals.push(severity); }
    if (status)    { clauses.push(`i.status = $${i++}`);               vals.push(status); }
    if (from_date) { clauses.push(`i.created_at >= $${i++}`);          vals.push(from_date); }
    if (to_date)   { clauses.push(`i.created_at < ($${i++}::date + 1)`); vals.push(to_date); }
    if (search) {
      clauses.push(`(i.title ILIKE $${i} OR i.incident_number ILIKE $${i} OR i.category ILIKE $${i})`);
      vals.push(`%${search}%`); i++;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await req.db.query(`
      SELECT i.*,
        u1.name AS assigned_name,
        u2.name AS created_by_name
      FROM incidents i
      LEFT JOIN users u1 ON u1.id = i.assigned_to
      LEFT JOIN users u2 ON u2.id = i.created_by
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${i} OFFSET $${i+1}
    `, [...vals, Number(limit), Number(offset)]);

    const countRow = await req.db.query(`SELECT COUNT(*) AS count FROM incidents i ${where}`, vals);
    return { data: rows || [], total: Number(countRow?.[0]?.count || 0) };
  });

  fastify.post("/incidents", async (req, reply) => {
    const {
      title, category, severity = "medium", description,
      camera_ids = [], assigned_to, tagged_user_ids = [], initial_comment,
    } = req.body || {};
    if (!title) return reply.code(400).send({ message: "title is required" });

    const num = incidentNumber();
    const rows = await req.db.query(`
      INSERT INTO incidents
        (incident_number, title, category, severity, description, camera_ids, assigned_to, tagged_user_ids, initial_comment, created_by)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10)
      RETURNING id, incident_number
    `, [num, title, category || null, severity, description || null,
        JSON.stringify(camera_ids), assigned_to || null,
        JSON.stringify(tagged_user_ids), initial_comment || null,
        req.user?.id || null]);

    return { id: rows[0].id, incident_number: rows[0].incident_number, message: "Incident created" };
  });

  fastify.get("/incidents/:id", async (req) => {
    const rows = await req.db.query(`
      SELECT i.*, u1.name AS assigned_name, u2.name AS created_by_name
      FROM incidents i
      LEFT JOIN users u1 ON u1.id = i.assigned_to
      LEFT JOIN users u2 ON u2.id = i.created_by
      WHERE i.id = $1
    `, [req.params.id]);
    return rows?.[0] || null;
  });

  fastify.post("/incidents/:id", async (req, reply) => {
    const { title, category, severity, description, status, assigned_to } = req.body || {};
    const fields = []; const vals = []; let i = 1;
    if (title !== undefined)       { fields.push(`title=$${i++}`);       vals.push(title); }
    if (category !== undefined)    { fields.push(`category=$${i++}`);    vals.push(category || null); }
    if (severity !== undefined)    { fields.push(`severity=$${i++}`);    vals.push(severity); }
    if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(description || null); }
    if (status !== undefined)      { fields.push(`status=$${i++}`);      vals.push(status); }
    if (assigned_to !== undefined) { fields.push(`assigned_to=$${i++}`); vals.push(assigned_to || null); }
    if (!fields.length) return reply.code(400).send({ message: "Nothing to update" });
    fields.push("updated_at=NOW()");
    vals.push(req.params.id);
    await req.db.query(`UPDATE incidents SET ${fields.join(",")} WHERE id=$${i}`, vals);
    return { message: "Updated" };
  });

  fastify.post("/incidents/:id/delete", async (req) => {
    await req.db.query("DELETE FROM incidents WHERE id=$1", [req.params.id]);
    return { message: "Deleted" };
  });
}
