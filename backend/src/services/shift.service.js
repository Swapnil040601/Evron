export const ShiftService = {

  getAll: async (db) => {
    return await db.query(`SELECT * FROM shifts WHERE status = 'Active' ORDER BY name`);
  },

  create: async (db, payload) => {
    const workDays = Array.isArray(payload.work_days) && payload.work_days.length
      ? payload.work_days
      : [1, 2, 3, 4, 5];
    const result = await db.query(`
      INSERT INTO shifts (name, start_time, end_time, break_start, break_end, grace_minutes, entry_deadline, ot_cutoff_time, work_days, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
      RETURNING *
    `, [payload.name, payload.start_time, payload.end_time, payload.break_start || null, payload.break_end || null, payload.grace_minutes ?? 10, payload.entry_deadline || null, payload.ot_cutoff_time || null, workDays]);
    return result?.[0];
  },

  update: async (db, id, payload) => {
    const fields = ["name", "start_time", "end_time", "break_start", "break_end", "grace_minutes", "entry_deadline", "ot_cutoff_time", "status", "work_days"];
    const updates = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (payload[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(payload[f]); }
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await db.query(`UPDATE shifts SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`, values);
    return result?.[0];
  },

  deleteOne: async (db, id) => {
    await db.query(`UPDATE shifts SET status = 'Inactive', updated_at = NOW() WHERE id = $1`, [id]);
    return { success: true };
  },

  // Assign shift to user
  assignToUser: async (db, userId, shiftId, fromDate, toDate = null) => {
    const result = await db.query(`
      INSERT INTO user_shifts (user_id, shift_id, from_date, to_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, from_date)
      DO UPDATE SET shift_id = EXCLUDED.shift_id, to_date = EXCLUDED.to_date
      RETURNING *
    `, [userId, shiftId, fromDate, toDate]);
    return result?.[0];
  },

  getUserShift: async (db, userId, date) => {
    const result = await db.query(`
      SELECT s.*, us.from_date, us.to_date
      FROM user_shifts us
      JOIN shifts s ON s.id = us.shift_id
      WHERE us.user_id = $1
        AND us.from_date <= $2
        AND (us.to_date IS NULL OR us.to_date >= $2)
        AND s.status = 'Active'
      ORDER BY us.from_date DESC
      LIMIT 1
    `, [userId, date]);
    return result?.[0] || null;
  },

  getUserShifts: async (db, userId) => {
    return await db.query(`
      SELECT us.*, s.name AS shift_name, s.start_time, s.end_time, s.grace_minutes, s.entry_deadline, s.ot_cutoff_time
      FROM user_shifts us
      JOIN shifts s ON s.id = us.shift_id
      WHERE us.user_id = $1
      ORDER BY us.from_date DESC
    `, [userId]);
  },

  // Compute late/early metrics for an attendance row
  computeMetrics: async (db, userId, date, loginTime, logoutTime) => {
    const shift = await ShiftService.getUserShift(db, userId, date);
    if (!shift) return null;

    const grace = Number(shift.grace_minutes || 0);

    // Parse times
    const shiftStart = new Date(`${date}T${shift.start_time}`);
    const shiftEnd   = new Date(`${date}T${shift.end_time}`);
    const breakStart = shift.break_start ? new Date(`${date}T${shift.break_start}`) : null;
    const breakEnd   = shift.break_end   ? new Date(`${date}T${shift.break_end}`)   : null;

    const login  = loginTime  ? new Date(loginTime)  : null;
    const logout = logoutTime ? new Date(logoutTime) : null;

    let lateMinutes = 0;
    let earlyExitMinutes = 0;
    let overtimeMinutes = 0;

    if (login) {
      const base = shift.entry_deadline
        ? new Date(`${date}T${shift.entry_deadline}`)
        : shiftStart;
      const diffMs = login - base - grace * 60 * 1000;
      if (diffMs > 0) lateMinutes = Math.round(diffMs / 60000);
    }

    if (logout) {
      const earlyMs = shiftEnd - logout;
      if (earlyMs > 0) earlyExitMinutes = Math.round(earlyMs / 60000);
      const otMs = logout - shiftEnd;
      if (otMs > 0) {
        let rawOt = Math.round(otMs / 60000);
        if (shift.ot_cutoff_time) {
          const cutoffStr = shift.ot_cutoff_time;
          let cutoff;
          if (cutoffStr === "00:00:00" || cutoffStr === "00:00") {
            cutoff = new Date(`${date}T00:00:00`);
            cutoff.setDate(cutoff.getDate() + 1);
          } else {
            cutoff = new Date(`${date}T${cutoffStr}`);
          }
          const maxOt = Math.round((cutoff - shiftEnd) / 60000);
          rawOt = Math.min(rawOt, Math.max(0, maxOt));
        }
        overtimeMinutes = rawOt;
      }
    }

    // Calculate scheduled working hours (shift duration minus break)
    let scheduledMs = shiftEnd - shiftStart;
    if (breakStart && breakEnd) scheduledMs -= (breakEnd - breakStart);
    const scheduledHours = scheduledMs / 3600000;

    return {
      shift_id: shift.id,
      shift_name: shift.name,
      shift_start: shift.start_time,
      shift_end: shift.end_time,
      grace_minutes: grace,
      late_minutes: lateMinutes,
      early_exit_minutes: earlyExitMinutes,
      overtime_minutes: overtimeMinutes,
      scheduled_hours: Math.round(scheduledHours * 100) / 100,
    };
  },

  // Summary of all user shift assignments
  getAssignments: async (db, filters = {}) => {
    const where = [];
    const values = [];
    let i = 1;
    if (filters.shift_id) { where.push(`us.shift_id = $${i++}`); values.push(filters.shift_id); }
    if (filters.user_id)  { where.push(`us.user_id = $${i++}`); values.push(filters.user_id); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    return await db.query(`
      SELECT
        us.id, us.user_id, u.name AS user_name, u.code,
        us.shift_id, s.name AS shift_name, s.start_time, s.end_time, s.grace_minutes,
        us.from_date, us.to_date
      FROM user_shifts us
      JOIN users u ON u.id = us.user_id
      JOIN shifts s ON s.id = us.shift_id
      ${whereSql}
      ORDER BY us.from_date DESC, u.name
    `, values);
  },

  // All active users with their current active shift (or null if unassigned)
  getUsersWithShifts: async (db) => {
    return await db.query(`
      SELECT DISTINCT ON (u.id)
        u.id          AS user_id,
        u.name        AS user_name,
        u.code,
        u.department,
        us.id         AS assignment_id,
        s.id          AS shift_id,
        s.name        AS shift_name,
        s.start_time,
        s.end_time,
        s.grace_minutes,
        us.from_date,
        us.to_date
      FROM users u
      LEFT JOIN user_shifts us
        ON us.user_id = u.id
        AND us.from_date <= CURRENT_DATE
        AND (us.to_date IS NULL OR us.to_date >= CURRENT_DATE)
      LEFT JOIN shifts s ON s.id = us.shift_id AND s.status = 'Active'
      WHERE u.deleted_at IS NULL AND u.status = 'Active'
      ORDER BY u.id, us.from_date DESC NULLS LAST
    `);
  },

  removeAssignment: async (db, assignmentId) => {
    await db.query(`DELETE FROM user_shifts WHERE id = $1`, [assignmentId]);
    return { success: true };
  },
};
