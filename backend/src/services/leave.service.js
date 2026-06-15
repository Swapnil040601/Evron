export const LeaveService = {

  // ── Leave Types ──────────────────────────────────────────────────────────

  getLeaveTypes: async (db) => {
    return db.query(`SELECT * FROM leave_types ORDER BY name`);
  },

  createLeaveType: async (db, { name, description = "", is_paid = true }) => {
    const rows = await db.query(
      `INSERT INTO leave_types (name, description, is_paid) VALUES ($1, $2, $3) RETURNING *`,
      [name, description, is_paid]
    );
    return rows[0];
  },

  updateLeaveType: async (db, id, { name, description, is_paid }) => {
    const rows = await db.query(
      `UPDATE leave_types SET name=$1, description=$2, is_paid=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [name, description, is_paid, id]
    );
    return rows[0] || null;
  },

  deleteLeaveType: async (db, id) => {
    await db.query(`DELETE FROM leave_types WHERE id=$1`, [id]);
    return { success: true };
  },

  // ── Leave Balances ────────────────────────────────────────────────────────

  getLeaveBalances: async (db, { user_id, year }) => {
    const conditions = [`LOWER(u.type) = 'staff'`, `u.status = 'Active'`, `u.deleted_at IS NULL`];
    const values = [year];
    let i = 2;
    if (user_id) { conditions.push(`u.id = $${i++}`); values.push(user_id); }

    return db.query(`
      SELECT
        u.id       AS user_id,
        u.name     AS user_name,
        u.department,
        lt.id      AS leave_type_id,
        lt.name    AS leave_type_name,
        lt.is_paid,
        COALESCE(lb.allocated, 0) AS allocated,
        COALESCE(lb.used,      0) AS used,
        COALESCE(lb.allocated, 0) - COALESCE(lb.used, 0) AS remaining,
        lb.id      AS balance_id
      FROM users u
      CROSS JOIN leave_types lt
      LEFT JOIN leave_balances lb
        ON lb.user_id = u.id AND lb.leave_type_id = lt.id AND lb.year = $1
      WHERE ${conditions.join(" AND ")}
      ORDER BY u.name, lt.name
    `, values);
  },

  upsertLeaveBalance: async (db, { user_id, leave_type_id, year, allocated }) => {
    const rows = await db.query(`
      INSERT INTO leave_balances (user_id, leave_type_id, year, allocated)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, leave_type_id, year)
      DO UPDATE SET allocated = EXCLUDED.allocated, updated_at = NOW()
      RETURNING *
    `, [user_id, leave_type_id, year, allocated]);
    return rows[0];
  },

  // ── Leave Applications ────────────────────────────────────────────────────

  getLeaveApplications: async (db, filters = {}) => {
    const { user_id, from, to, status, page = 1, limit = 50 } = filters;
    const offset = (Number(page) - 1) * Number(limit);

    const conds = [`u.deleted_at IS NULL`];
    const vals  = [];
    let i = 1;

    if (user_id) { conds.push(`la.user_id = $${i++}`); vals.push(user_id); }
    if (from)    { conds.push(`la.to_date >= $${i++}`); vals.push(from); }
    if (to)      { conds.push(`la.from_date <= $${i++}`); vals.push(to); }
    if (status)  { conds.push(`la.status = $${i++}`); vals.push(status); }

    const where = conds.join(" AND ");

    const runQueries = () => Promise.all([
      db.query(`
        SELECT COUNT(*) AS total
        FROM leave_applications la
        JOIN users u ON u.id = la.user_id
        WHERE ${where}
      `, vals),
      db.query(`
        SELECT
          la.*,
          u.name        AS user_name,
          u.department,
          lt.name       AS leave_type_name,
          lt.is_paid,
          ab.name       AS applied_by_name,
          ap.name       AS approved_by_name
        FROM leave_applications la
        JOIN users u   ON u.id  = la.user_id
        LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
        LEFT JOIN users ab  ON ab.id = la.applied_by
        LEFT JOIN users ap  ON ap.id = la.approved_by
        WHERE ${where}
        ORDER BY la.from_date DESC
        LIMIT $${i} OFFSET $${i + 1}
      `, [...vals, Number(limit), offset]),
    ]);

    let countRows, rows;
    try {
      [countRows, rows] = await runQueries();
    } catch (err) {
      if (!err.message?.includes("approved_by") && !err.message?.includes("status")) throw err;
      await db.query(`
        ALTER TABLE leave_applications
          ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'Approved',
          ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
      `);
      [countRows, rows] = await runQueries();
    }

    return {
      rows,
      total: Number(countRows[0]?.total || 0),
      page: Number(page),
      limit: Number(limit),
    };
  },

  // Leaves submitted by employees who report to a given manager
  getReporteesLeaves: async (db, manager_id, status) => {
    const conds = [`u.reporting_manager_id = $1`, `u.deleted_at IS NULL`];
    const vals  = [manager_id];
    if (status) { conds.push(`la.status = $2`); vals.push(status); }

    const runQuery = () => db.query(`
      SELECT
        la.*,
        u.name        AS user_name,
        u.department,
        lt.name       AS leave_type_name,
        lt.is_paid
      FROM leave_applications la
      JOIN users u ON u.id = la.user_id
      LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
      WHERE ${conds.join(" AND ")}
      ORDER BY la.created_at DESC
    `, vals);

    try {
      return await runQuery();
    } catch (err) {
      if (!err.message?.includes("status")) throw err;
      await db.query(`
        ALTER TABLE leave_applications
          ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'Approved',
          ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
      `);
      return runQuery();
    }
  },

  approveLeaveApplication: async (db, id, status, approvedById) => {
    if (!["Approved", "Rejected"].includes(status)) throw new Error("Status must be Approved or Rejected");

    const existing = await db.query(`SELECT * FROM leave_applications WHERE id=$1`, [id]);
    if (!existing[0]) return null;
    const app = existing[0];

    // If rejecting a previously-approved application, reverse the attendance + balance
    if (status === "Rejected" && app.status === "Approved") {
      await db.query(`
        WITH dates AS (SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d)
        UPDATE attendances SET status = 'Absent', updated_at = NOW()
        WHERE user_id = $3 AND date IN (SELECT d FROM dates) AND status = 'On Leave'
      `, [app.from_date, app.to_date, app.user_id]);

      if (app.leave_type_id && app.no_of_days) {
        const yr = new Date(String(app.from_date).slice(0, 10)).getFullYear();
        await db.query(`
          UPDATE leave_balances SET used = GREATEST(0, used - $1), updated_at = NOW()
          WHERE user_id=$2 AND leave_type_id=$3 AND year=$4
        `, [app.no_of_days, app.user_id, app.leave_type_id, yr]);
      }
    }

    // If approving a previously-rejected/pending application, apply attendance + balance
    if (status === "Approved" && app.status !== "Approved") {
      await db.query(`
        WITH dates AS (SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d)
        INSERT INTO attendances (user_id, date, status)
        SELECT $3, d, 'On Leave' FROM dates
        ON CONFLICT (user_id, date) DO UPDATE SET status = 'On Leave', updated_at = NOW()
      `, [app.from_date, app.to_date, app.user_id]);

      if (app.leave_type_id) {
        const yr = new Date(String(app.from_date).slice(0, 10)).getFullYear();
        await db.query(`
          INSERT INTO leave_balances (user_id, leave_type_id, year, allocated, used)
          VALUES ($1, $2, $3, 0, $4)
          ON CONFLICT (user_id, leave_type_id, year)
          DO UPDATE SET used = leave_balances.used + $4, updated_at = NOW()
        `, [app.user_id, app.leave_type_id, yr, app.no_of_days]);
      }
    }

    const rows = await db.query(`
      UPDATE leave_applications
      SET status=$1, approved_by=$2, approved_at=NOW(), updated_at=NOW()
      WHERE id=$3 RETURNING *
    `, [status, approvedById || null, id]);
    return rows[0] || null;
  },

  createLeaveApplication: async (db, data, appliedById, isUserSubmission = false) => {
    const {
      user_id, leave_type_id, from_date, to_date,
      no_of_days, reason = "", is_lop = false,
    } = data;

    // User-submitted leaves start as Pending; admin-created are immediately Approved
    const status = isUserSubmission ? "Pending" : "Approved";

    // Try INSERT with status column (requires migration 22). Fall back to INSERT
    // without it if the column doesn't yet exist, so leaves can still be created
    // while the backend is pending a restart to apply the migration.
    let appRows;
    try {
      appRows = await db.query(`
        INSERT INTO leave_applications
          (user_id, leave_type_id, from_date, to_date, no_of_days, reason, is_lop, applied_by, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `, [user_id, leave_type_id || null, from_date, to_date, no_of_days, reason, is_lop, appliedById || null, status]);
    } catch (err) {
      if (!err.message?.includes('"status"') && !err.message?.includes("status")) throw err;
      // status column missing — apply the migration inline then retry
      await db.query(`
        ALTER TABLE leave_applications
          ADD COLUMN IF NOT EXISTS status      VARCHAR(20) NOT NULL DEFAULT 'Approved',
          ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
      `);
      appRows = await db.query(`
        INSERT INTO leave_applications
          (user_id, leave_type_id, from_date, to_date, no_of_days, reason, is_lop, applied_by, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `, [user_id, leave_type_id || null, from_date, to_date, no_of_days, reason, is_lop, appliedById || null, status]);
    }

    const app = appRows[0];

    // Only update attendance + balance for approved applications immediately
    if (status !== "Approved") return app;

    // Mark each day in range as "On Leave" in attendances
    await db.query(`
      WITH dates AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d
      )
      INSERT INTO attendances (user_id, date, status)
      SELECT $3, d, 'On Leave'
      FROM dates
      ON CONFLICT (user_id, date) DO UPDATE SET status = 'On Leave', updated_at = NOW()
    `, [from_date, to_date, user_id]);

    // Update used count in leave_balances for the leave year
    if (leave_type_id) {
      const yr = new Date(from_date).getFullYear();
      await db.query(`
        INSERT INTO leave_balances (user_id, leave_type_id, year, allocated, used)
        VALUES ($1, $2, $3, 0, $4)
        ON CONFLICT (user_id, leave_type_id, year)
        DO UPDATE SET used = leave_balances.used + $4, updated_at = NOW()
      `, [user_id, leave_type_id, yr, no_of_days]);
    }

    return app;
  },

  updateLeaveApplication: async (db, id, data) => {
    // Fetch existing to reverse balance changes
    const existing = await db.query(`SELECT * FROM leave_applications WHERE id=$1`, [id]);
    if (!existing[0]) return null;
    const old = existing[0];

    const {
      user_id = old.user_id,
      leave_type_id = old.leave_type_id,
      from_date = old.from_date,
      to_date = old.to_date,
      no_of_days = old.no_of_days,
      reason = old.reason,
      is_lop = old.is_lop,
    } = data;

    // Reverse old balance
    if (old.leave_type_id && old.no_of_days) {
      const yr = new Date(String(old.from_date).slice(0, 10)).getFullYear();
      await db.query(`
        UPDATE leave_balances SET used = GREATEST(0, used - $1), updated_at = NOW()
        WHERE user_id=$2 AND leave_type_id=$3 AND year=$4
      `, [old.no_of_days, old.user_id, old.leave_type_id, yr]);
    }

    // Revert old attendance dates
    await db.query(`
      WITH dates AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d
      )
      UPDATE attendances SET status = 'Absent', updated_at = NOW()
      WHERE user_id = $3 AND date IN (SELECT d FROM dates) AND status = 'On Leave'
    `, [old.from_date, old.to_date, old.user_id]);

    // Update record
    const rows = await db.query(`
      UPDATE leave_applications
      SET user_id=$1, leave_type_id=$2, from_date=$3, to_date=$4,
          no_of_days=$5, reason=$6, is_lop=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [user_id, leave_type_id || null, from_date, to_date, no_of_days, reason, is_lop, id]);

    // Apply new attendance dates
    await db.query(`
      WITH dates AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d
      )
      INSERT INTO attendances (user_id, date, status)
      SELECT $3, d, 'On Leave' FROM dates
      ON CONFLICT (user_id, date) DO UPDATE SET status = 'On Leave', updated_at = NOW()
    `, [from_date, to_date, user_id]);

    // Apply new balance
    if (leave_type_id) {
      const yr = new Date(String(from_date).slice(0, 10)).getFullYear();
      await db.query(`
        INSERT INTO leave_balances (user_id, leave_type_id, year, allocated, used)
        VALUES ($1, $2, $3, 0, $4)
        ON CONFLICT (user_id, leave_type_id, year)
        DO UPDATE SET used = leave_balances.used + $4, updated_at = NOW()
      `, [user_id, leave_type_id, yr, no_of_days]);
    }

    return rows[0] || null;
  },

  deleteLeaveApplication: async (db, id) => {
    const existing = await db.query(`SELECT * FROM leave_applications WHERE id=$1`, [id]);
    if (!existing[0]) return { success: false };
    const old = existing[0];

    // Revert attendance
    await db.query(`
      WITH dates AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d
      )
      UPDATE attendances SET status = 'Absent', updated_at = NOW()
      WHERE user_id = $3 AND date IN (SELECT d FROM dates) AND status = 'On Leave'
    `, [old.from_date, old.to_date, old.user_id]);

    // Reverse balance
    if (old.leave_type_id && old.no_of_days) {
      const yr = new Date(String(old.from_date).slice(0, 10)).getFullYear();
      await db.query(`
        UPDATE leave_balances SET used = GREATEST(0, used - $1), updated_at = NOW()
        WHERE user_id=$2 AND leave_type_id=$3 AND year=$4
      `, [old.no_of_days, old.user_id, old.leave_type_id, yr]);
    }

    await db.query(`DELETE FROM leave_applications WHERE id=$1`, [id]);
    return { success: true };
  },

  // ── Person report helper ──────────────────────────────────────────────────

  getLeaveReport: async (db, { user_id, from, to }) => {
    const year = new Date(String(from).slice(0, 10)).getFullYear();

    const [applications, balances] = await Promise.all([
      db.query(`
        SELECT la.*, lt.name AS leave_type_name, lt.is_paid
        FROM leave_applications la
        LEFT JOIN leave_types lt ON lt.id = la.leave_type_id
        WHERE la.user_id = $1
          AND la.to_date   >= $2
          AND la.from_date <= $3
        ORDER BY la.from_date
      `, [user_id, from, to]),

      db.query(`
        SELECT lt.name AS leave_type_name, lt.is_paid,
               COALESCE(lb.allocated,0) AS allocated,
               COALESCE(lb.used,0)      AS used,
               COALESCE(lb.allocated,0) - COALESCE(lb.used,0) AS remaining
        FROM leave_types lt
        LEFT JOIN leave_balances lb
          ON lb.leave_type_id = lt.id AND lb.user_id = $1 AND lb.year = $2
        ORDER BY lt.name
      `, [user_id, year]),
    ]);

    return { applications, balances, year };
  },
};
