export const CanteenService = {

  getTokens: async (db, filters = {}) => {
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 50);
    const offset = (page - 1) * limit;

    const where = [];
    const values = [];
    let i = 1;

    if (filters.date) {
      where.push(`ct.date = $${i++}`);
      values.push(filters.date);
    }
    if (filters.month) {
      where.push(`TO_CHAR(ct.date, 'YYYY-MM') = $${i++}`);
      values.push(filters.month);
    }
    if (filters.user_id) {
      where.push(`ct.user_id = $${i++}`);
      values.push(filters.user_id);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await db.query(`
      SELECT
        ct.id,
        ct.user_id,
        u.name AS user_name,
        u.code AS employee_code,
        u.department,
        ct.date,
        ct.punched_at,
        ct.camera_id,
        c.name AS camera_name
      FROM canteen_tokens ct
      JOIN users u ON u.id = ct.user_id
      LEFT JOIN cameras c ON c.id = ct.camera_id
      ${whereSql}
      ORDER BY ct.punched_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `, [...values, limit, offset]);

    const countRows = await db.query(`
      SELECT COUNT(*) AS total FROM canteen_tokens ct ${whereSql}
    `, values);

    const total = Number(countRows?.[0]?.total ?? 0);

    return {
      rows: rows || [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  getDailySummary: async (db, filters = {}) => {
    const where = [];
    const values = [];
    let i = 1;

    if (filters.month) {
      where.push(`TO_CHAR(ct.date, 'YYYY-MM') = $${i++}`);
      values.push(filters.month);
    } else {
      // default: current month
      where.push(`ct.date >= DATE_TRUNC('month', CURRENT_DATE)`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await db.query(`
      SELECT
        ct.date,
        COUNT(*) AS token_count,
        STRING_AGG(u.name, ', ' ORDER BY u.name) AS names
      FROM canteen_tokens ct
      JOIN users u ON u.id = ct.user_id
      ${whereSql}
      GROUP BY ct.date
      ORDER BY ct.date DESC
    `, values);

    return rows || [];
  },

  getMonthlyReport: async (db, filters = {}) => {
    const month = filters.month || new Date().toISOString().slice(0, 7);

    const daily = await db.query(`
      SELECT
        ct.date,
        COUNT(*) AS token_count
      FROM canteen_tokens ct
      WHERE TO_CHAR(ct.date, 'YYYY-MM') = $1
      GROUP BY ct.date
      ORDER BY ct.date
    `, [month]);

    const topUsers = await db.query(`
      SELECT
        u.name,
        u.code,
        COUNT(*) AS visit_count
      FROM canteen_tokens ct
      JOIN users u ON u.id = ct.user_id
      WHERE TO_CHAR(ct.date, 'YYYY-MM') = $1
      GROUP BY u.id, u.name, u.code
      ORDER BY visit_count DESC
      LIMIT 20
    `, [month]);

    const total = (daily || []).reduce((s, r) => s + Number(r.token_count), 0);

    return {
      month,
      total_tokens: total,
      working_days: (daily || []).length,
      avg_per_day: (daily || []).length > 0 ? Math.round(total / (daily || []).length) : 0,
      daily: daily || [],
      top_users: topUsers || [],
    };
  },

  // ── Canteen Settings ────────────────────────────────────────────────────────

  getSettings: async (db) => {
    return db.query(`
      SELECT cs.*, c.name AS camera_name
      FROM canteen_settings cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      ORDER BY cs.start_time
    `);
  },

  createSetting: async (db, { meal_type, start_time, end_time, camera_id }) => {
    const rows = await db.query(`
      INSERT INTO canteen_settings (meal_type, start_time, end_time, camera_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [meal_type, start_time, end_time, camera_id || null]);
    return rows[0];
  },

  updateSetting: async (db, id, { meal_type, start_time, end_time, camera_id }) => {
    const rows = await db.query(`
      UPDATE canteen_settings
      SET meal_type=$1, start_time=$2, end_time=$3, camera_id=$4, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [meal_type, start_time, end_time, camera_id || null, id]);
    return rows[0] || null;
  },

  deleteSetting: async (db, id) => {
    await db.query(`DELETE FROM canteen_settings WHERE id=$1`, [id]);
    return { success: true };
  },

  // ── Meal Report ──────────────────────────────────────────────────────────────
  // Returns all configured settings (for column headers) + per-date meal counts
  // with the employee list embedded in each cell.

  getMealReport: async (db, { from, to }) => {
    const settings = await db.query(`
      SELECT cs.*, c.name AS camera_name
      FROM canteen_settings cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      ORDER BY cs.start_time
    `);

    if (settings.length === 0) return { settings, rows: [] };

    // Deduplicate users per (date, meal_type) then aggregate
    const rows = await db.query(`
      WITH meal_users AS (
        SELECT DISTINCT
          ct.date,
          cs.meal_type,
          ct.user_id,
          u.name  AS user_name,
          u.code,
          u.department
        FROM canteen_tokens ct
        JOIN users u ON u.id = ct.user_id
        JOIN canteen_settings cs ON
          (cs.camera_id IS NULL OR ct.camera_id = cs.camera_id)
          AND ct.punched_at::time BETWEEN cs.start_time AND cs.end_time
        WHERE ct.date BETWEEN $1 AND $2
      )
      SELECT
        date,
        meal_type,
        COUNT(*) AS count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'user_id',    user_id,
            'user_name',  user_name,
            'code',       code,
            'department', department
          ) ORDER BY user_name
        ) AS employees
      FROM meal_users
      GROUP BY date, meal_type
      ORDER BY date DESC, meal_type
    `, [from, to]);

    return { settings, rows };
  },

  getPersonReport: async (db, userId, from, to) => {
    const user = await db.query(`SELECT id, name, code, department, type, role, status FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, [userId]);
    if (!user?.[0]) return null;

    // All closed camera sessions in range. Open sessions are intentionally skipped so
    // phone/productivity totals do not grow forever while someone is still visible.
    const sessions = await db.query(`
      SELECT
        cs.id,
        cs.start_time,
        cs.end_time,
        EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time)) AS duration_seconds,
        c.name AS camera_name,
        c.camera_type,
        cs.confidence,
        cs.phone_seen_count,
        cs.total_frame_count,
        CASE WHEN cs.total_frame_count > 0
          THEN ROUND((
            cs.phone_seen_count::numeric
            / cs.total_frame_count
            * EXTRACT(EPOCH FROM (cs.end_time - cs.start_time))
          ))
          ELSE 0
        END AS phone_seconds,
        CASE WHEN cs.total_frame_count > 0
          THEN ROUND((cs.phone_seen_count::float / cs.total_frame_count * 100)::numeric, 1)
          ELSE 0
        END AS phone_pct
      FROM camera_sessions cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE cs.user_id = $1
        AND cs.start_time >= $2
        AND cs.start_time < ($3::date + INTERVAL '1 day')
        AND cs.end_time IS NOT NULL
      ORDER BY cs.start_time
    `, [userId, from, to]);

    const dailyAttendance = await db.query(`
      WITH days AS (
        SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS date
      ),
      cs_day AS (
        SELECT
          cs.user_id,
          DATE(cs.start_time) AS date,
          MIN(cs.start_time) AS login_time,
          MAX(cs.end_time) AS logout_time,
          SUM(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)))::int AS camera_seconds,
          SUM(CASE WHEN COALESCE(c.camera_type,'work_area') IN ('work_area','meeting_room','reception')
            THEN EXTRACT(EPOCH FROM (cs.end_time - cs.start_time))
                 * (1 - LEAST(CASE WHEN cs.total_frame_count > 0
                              THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
            ELSE 0 END)::int AS productive_seconds,
          SUM(CASE WHEN cs.total_frame_count > 0
            THEN ROUND(
              cs.phone_seen_count::numeric
              / cs.total_frame_count
              * EXTRACT(EPOCH FROM (cs.end_time - cs.start_time))
            )
            ELSE 0 END)::int AS phone_seconds,
          SUM(cs.phone_seen_count) AS phone_seen_count,
          SUM(cs.total_frame_count) AS total_frame_count,
          CASE WHEN SUM(cs.total_frame_count) > 0
            THEN ROUND((SUM(cs.phone_seen_count)::float / SUM(cs.total_frame_count) * 100)::numeric, 1)
            ELSE 0
          END AS phone_pct
        FROM camera_sessions cs
        LEFT JOIN cameras c ON c.id = cs.camera_id
        WHERE cs.user_id = $1
          AND cs.start_time >= $2
          AND cs.start_time < ($3::date + INTERVAL '1 day')
          AND cs.end_time IS NOT NULL
        GROUP BY cs.user_id, DATE(cs.start_time)
      )
      SELECT
        d.date,
        cs_day.login_time,
        cs_day.logout_time,
        COALESCE(cs_day.camera_seconds, 0) AS camera_seconds,
        COALESCE(cs_day.productive_seconds, 0) AS productive_seconds,
        COALESCE(cs_day.phone_seconds, 0) AS phone_seconds,
        COALESCE(cs_day.phone_seen_count, 0) AS phone_seen_count,
        COALESCE(cs_day.total_frame_count, 0) AS total_frame_count,
        COALESCE(cs_day.phone_pct, 0) AS phone_pct,
        COALESCE(a.late_minutes,
          CASE WHEN cs_day.login_time IS NOT NULL AND sh.shift_start IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            cs_day.login_time::time - (sh.shift_start + MAKE_INTERVAL(mins => sh.grace_minutes))
          )) / 60)::int
          ELSE 0 END
        ) AS late_minutes,
        COALESCE(a.early_exit_minutes,
          CASE WHEN cs_day.logout_time IS NOT NULL AND sh.shift_end IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            sh.shift_end - cs_day.logout_time::time
          )) / 60)::int
          ELSE 0 END
        ) AS early_exit_minutes,
        COALESCE(a.overtime_minutes,
          CASE WHEN cs_day.logout_time IS NOT NULL AND sh.shift_end IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            cs_day.logout_time::time - sh.shift_end
          )) / 60)::int
          ELSE 0 END
        ) AS overtime_minutes,
        CASE
          WHEN hol.id IS NOT NULL THEN 'Holiday'
          WHEN a.status IS NOT NULL THEN a.status
          WHEN cs_day.user_id IS NOT NULL THEN 'Present'
          ELSE 'Absent'
        END AS status,
        a.remarks,
        hol.name AS holiday_name,
        hol.type AS holiday_type,
        sh.shift_start,
        sh.shift_end
      FROM days d
      LEFT JOIN cs_day ON cs_day.date = d.date
      LEFT JOIN attendances a ON a.user_id = $1 AND a.date = d.date
      LEFT JOIN holidays hol ON hol.date = d.date
      LEFT JOIN LATERAL (
        SELECT
          s.start_time AS shift_start,
          s.end_time AS shift_end,
          COALESCE(s.grace_minutes, 0)::int AS grace_minutes
        FROM user_shifts us
        JOIN shifts s ON s.id = us.shift_id
        WHERE us.user_id = $1
          AND us.from_date <= d.date
          AND (us.to_date IS NULL OR us.to_date >= d.date)
          AND s.status = 'Active'
        ORDER BY us.from_date DESC
        LIMIT 1
      ) sh ON TRUE
      ORDER BY d.date DESC
    `, [userId, from, to]);

    // Area breakdown
    const areaBreakdown = await db.query(`
      SELECT
        COALESCE(c.camera_type, 'work_area') AS camera_type,
        c.name AS camera_name,
        COUNT(*) AS sessions,
        ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))) / 3600, 2) AS total_hours,
        SUM(CASE WHEN cs.total_frame_count > 0
          THEN ROUND(
            cs.phone_seen_count::numeric
            / cs.total_frame_count
            * EXTRACT(EPOCH FROM (cs.end_time - cs.start_time))
          )
          ELSE 0 END)::int AS phone_seconds,
        ROUND(AVG(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count * 100 ELSE 0 END)::numeric, 1) AS avg_phone_pct
      FROM camera_sessions cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE cs.user_id = $1
        AND cs.start_time >= $2
        AND cs.start_time < ($3::date + INTERVAL '1 day')
        AND cs.end_time IS NOT NULL
      GROUP BY COALESCE(c.camera_type, 'work_area'), c.name
      ORDER BY total_hours DESC
    `, [userId, from, to]);

    // Canteen tokens in range
    const canteenVisits = await db.query(`
      SELECT ct.date, ct.punched_at, c.name AS camera_name
      FROM canteen_tokens ct
      LEFT JOIN cameras c ON c.id = ct.camera_id
      WHERE ct.user_id = $1 AND ct.date BETWEEN $2 AND $3
      ORDER BY ct.date
    `, [userId, from, to]);

    // Summary
    const summary = await db.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN COALESCE(c.camera_type, 'work_area') IN ('work_area', 'meeting_room', 'reception')
            THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
                 * (1 - LEAST(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
            ELSE 0
          END
        ) / 3600, 0) AS productive_hours,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
        ) / 3600, 0) AS total_hours,
        COALESCE(SUM(CASE WHEN cs.total_frame_count > 0
          THEN ROUND(
            cs.phone_seen_count::numeric
            / cs.total_frame_count
            * EXTRACT(EPOCH FROM (cs.end_time - cs.start_time))
          )
          ELSE 0 END), 0)::int AS phone_seconds,
        COALESCE(SUM(cs.phone_seen_count), 0) AS total_phone_frames,
        COALESCE(SUM(cs.total_frame_count), 0) AS total_frames
      FROM camera_sessions cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE cs.user_id = $1
        AND cs.start_time >= $2
        AND cs.start_time < ($3::date + INTERVAL '1 day')
        AND cs.end_time IS NOT NULL
    `, [userId, from, to]);

    const sum = summary?.[0] || {};
    const days = dailyAttendance || [];
    const presentDays = days.filter((day) => ["Present", "Half Day"].includes(day.status)).length;
    const absentDays = days.filter((day) => day.status === "Absent").length;
    const leaveDays = days.filter((day) => day.status === "On Leave").length;
    const holidayDays = days.filter((day) => day.status === "Holiday").length;
    const lateDays = days.filter((day) => Number(day.late_minutes || 0) > 0).length;
    const earlyExitDays = days.filter((day) => Number(day.early_exit_minutes || 0) > 0).length;
    const overtimeDays = days.filter((day) => Number(day.overtime_minutes || 0) > 0).length;
    const totalLateMinutes = days.reduce((total, day) => total + Number(day.late_minutes || 0), 0);
    const totalEarlyExitMinutes = days.reduce((total, day) => total + Number(day.early_exit_minutes || 0), 0);
    const totalOvertimeMinutes = days.reduce((total, day) => total + Number(day.overtime_minutes || 0), 0);
    const workableDays = Math.max(days.length - holidayDays, 0);
    const phonePct = Number(sum.total_frames) > 0
      ? Math.round(Number(sum.total_phone_frames) / Number(sum.total_frames) * 100)
      : 0;
    const totalHours = Number(sum.total_hours || 0);
    const productiveHours = Number(sum.productive_hours || 0);
    const productivityPct = totalHours > 0 ? Math.round(productiveHours / totalHours * 100) : 0;
    const attendancePct = workableDays > 0 ? Math.round((presentDays + leaveDays) / workableDays * 100) : 0;
    const consistencyScore = Math.max(0, Math.min(100,
      attendancePct
      - Math.min(lateDays * 5, 25)
      - Math.min(earlyExitDays * 4, 20)
      - Math.min(phonePct, 30)
      + Math.min(overtimeDays * 2, 10)
    ));

    return {
      user: user[0],
      from,
      to,
      summary: {
        total_days: days.length,
        workable_days: workableDays,
        present_days: presentDays,
        absent_days: absentDays,
        leave_days: leaveDays,
        holiday_days: holidayDays,
        late_days: lateDays,
        early_exit_days: earlyExitDays,
        overtime_days: overtimeDays,
        total_late_minutes: totalLateMinutes,
        total_early_exit_minutes: totalEarlyExitMinutes,
        total_overtime_minutes: totalOvertimeMinutes,
        attendance_pct: attendancePct,
        consistency_score: consistencyScore,
        productivity_pct: productivityPct,
        total_hours: totalHours,
        productive_hours: productiveHours,
        phone_pct: phonePct,
        phone_seconds: Number(sum.phone_seconds || 0),
        phone_hours: Math.round(Number(sum.phone_seconds || 0) / 360) / 10,
        canteen_visits: (canteenVisits || []).length,
      },
      sessions: sessions || [],
      daily_attendance: days,
      area_breakdown: areaBreakdown || [],
      canteen_visits: canteenVisits || [],
    };
  },
};
