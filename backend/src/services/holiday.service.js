export const HolidayService = {

  getAll: async (db, filters = {}) => {
    const where = [];
    const values = [];
    let i = 1;
    if (filters.year)  { where.push(`EXTRACT(YEAR  FROM date) = $${i++}`); values.push(Number(filters.year)); }
    if (filters.month) { where.push(`EXTRACT(MONTH FROM date) = $${i++}`); values.push(Number(filters.month)); }
    if (filters.type)  { where.push(`type = $${i++}`); values.push(filters.type); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return await db.query(`SELECT * FROM holidays ${whereSql} ORDER BY date`, values);
  },

  create: async (db, payload) => {
    const result = await db.query(`
      INSERT INTO holidays (date, name, description, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [payload.date, payload.name, payload.description || null, payload.type || 'National']);
    return result?.[0];
  },

  update: async (db, id, payload) => {
    const fields = ['date', 'name', 'description', 'type'];
    const updates = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (payload[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(payload[f]); }
    }
    if (!updates.length) return null;
    values.push(id);
    const result = await db.query(
      `UPDATE holidays SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, values
    );
    return result?.[0];
  },

  deleteOne: async (db, id) => {
    await db.query(`DELETE FROM holidays WHERE id = $1`, [id]);
    return { success: true };
  },

  // Bulk upsert from CSV import: [{date, name, type, description}]
  importMany: async (db, holidays) => {
    let inserted = 0;
    let skipped = 0;
    for (const h of holidays) {
      if (!h.date || !h.name) { skipped++; continue; }
      try {
        await db.query(`
          INSERT INTO holidays (date, name, description, type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (date, name) DO UPDATE
            SET description = EXCLUDED.description,
                type = EXCLUDED.type
        `, [h.date, h.name.trim(), h.description?.trim() || null, h.type?.trim() || 'National']);
        inserted++;
      } catch {
        skipped++;
      }
    }
    return { inserted, skipped };
  },

  // Check if a specific date is a holiday; returns the holiday row or null
  getByDate: async (db, date) => {
    const result = await db.query(`SELECT * FROM holidays WHERE date = $1 ORDER BY id LIMIT 1`, [date]);
    return result?.[0] || null;
  },

  // Returns set of holiday date strings within a range for fast lookup
  getDateSet: async (db, from, to) => {
    const rows = await db.query(
      `SELECT date::text FROM holidays WHERE date >= $1 AND date <= $2`, [from, to]
    );
    return new Set((rows || []).map(r => r.date.slice(0, 10)));
  },
};
