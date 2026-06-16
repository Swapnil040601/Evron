export const ExpenseService = {
  create: async (db, userId, data) => {
    const { category, amount, currency, expense_date, description, receipt_path } = data;

    // Attach current GPS walk distance if this is today's expense
    let gpsWalkKm = null;
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (expense_date === today) {
        const locRow = await db.query(
          `SELECT walk_distance_m FROM employee_locations WHERE user_id = $1`,
          [userId]
        );
        if (locRow.rows[0]?.walk_distance_m != null) {
          gpsWalkKm = parseFloat((locRow.rows[0].walk_distance_m / 1000).toFixed(3));
        }
      }
    } catch {}

    const result = await db.query(`
      INSERT INTO expenses
        (user_id, category, amount, currency, expense_date, description, receipt_path, gps_walk_km)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [userId, category, amount, currency || 'INR', expense_date, description || null, receipt_path || null, gpsWalkKm]);

    return result.rows[0];
  },

  getMy: async (db, userId) => {
    const result = await db.query(`
      SELECT e.*,
             u.name AS user_name, u.code AS employee_code, u.avatar,
             r.name AS reviewed_by_name
      FROM expenses e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN users r ON r.id = e.reviewed_by
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC
    `, [userId]);
    return result.rows;
  },

  getAll: async (db, filters = {}) => {
    const where = [];
    const values = [];
    let i = 1;

    if (filters.status) {
      where.push(`e.status = $${i}`);
      values.push(filters.status);
      i++;
    }
    if (filters.user_id) {
      where.push(`e.user_id = $${i}`);
      values.push(filters.user_id);
      i++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT e.*,
             u.name AS user_name, u.code AS employee_code, u.avatar,
             r.name AS reviewed_by_name,
             el.walk_distance_m AS current_gps_walk_m,
             el.updated_at AS gps_updated_at
      FROM expenses e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN users r ON r.id = e.reviewed_by
      LEFT JOIN employee_locations el ON el.user_id = e.user_id
      ${whereClause}
      ORDER BY e.created_at DESC
    `, values);
    return result.rows;
  },

  updateStatus: async (db, expenseId, status, adminNote, reviewerId) => {
    const result = await db.query(`
      UPDATE expenses
      SET status = $1, admin_note = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, adminNote || null, reviewerId, expenseId]);
    return result.rows[0];
  },

  uploadReceipt: async (db, expenseId, userId, receiptPath) => {
    const result = await db.query(`
      UPDATE expenses SET receipt_path = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [receiptPath, expenseId, userId]);
    return result.rows[0];
  }
};
