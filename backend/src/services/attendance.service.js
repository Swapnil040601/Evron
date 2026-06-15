import { Parser } from "json2csv";

function buildWhere(filters = {}) {
  const where = [];
  const values = [];
  let i = 1;

  where.push(`u.deleted_at IS NULL`);
  where.push(`u.status = 'Active'`);

  if (filters.from) {
    where.push(`a.date >= $${i}`);
    values.push(filters.from);
    i++;
  }

  if (filters.to) {
    where.push(`a.date <= $${i}`);
    values.push(filters.to);
    i++;
  }

  if (filters.user_id) {
    where.push(`a.user_id = $${i}`);
    values.push(filters.user_id);
    i++;
  }

  if (filters.status) {
    where.push(`a.status = $${i}`);
    values.push(filters.status);
    i++;
  }

  if (filters.search) {
    where.push(`
      (
        COALESCE(u.name, '') ILIKE $${i}
        OR COALESCE(a.status, '') ILIKE $${i}
        OR COALESCE(a.remarks, '') ILIKE $${i}
      )
    `);
    values.push(`%${filters.search}%`);
    i++;
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

export const AttendanceService = {
  getData: async (db, filters = {}) => {
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 20);
    const offset = (page - 1) * limit;

    // Default to today if no date range provided
    const today = new Date().toISOString().slice(0, 10);
    const from = filters.from || today;
    const to   = filters.to   || from;

    // Params for data/count queries (includes status filter)
    const params = [from, to]; // $1, $2 used by inner subquery
    let pi = 3;
    const outerWhere = [`u.status = 'Active'`, `u.deleted_at IS NULL`, `LOWER(u.type) = 'staff'`];

    if (filters.user_id) {
      outerWhere.push(`u.id = $${pi++}`);
      params.push(filters.user_id);
    }
    if (filters.search) {
      outerWhere.push(`COALESCE(u.name, '') ILIKE $${pi++}`);
      params.push(`%${filters.search}%`);
    }
    if (filters.status) {
      outerWhere.push(`COALESCE(a.status, 'Present') = $${pi++}`);
      params.push(filters.status);
    }
    const outerWhereSQL = outerWhere.join(" AND ");

    // Summary params — same as params but WITHOUT status filter so absent users are counted
    const summaryParams = [from, to];
    let spi = 3;
    const summaryWhere = [`u.status = 'Active'`, `u.deleted_at IS NULL`, `LOWER(u.type) = 'staff'`];
    if (filters.user_id) { summaryWhere.push(`u.id = $${spi++}`); summaryParams.push(filters.user_id); }
    if (filters.search)  { summaryWhere.push(`COALESCE(u.name, '') ILIKE $${spi++}`); summaryParams.push(`%${filters.search}%`); }
    const summaryWhereSQL = summaryWhere.join(" AND ");

    // Subquery: one row per user per day from camera_sessions
    // Use DATE(cs.start_time) without timezone conversion — matches dashboard behavior
    // productive/working use COALESCE(end_time,NOW()) to include active sessions
    // phone_seconds uses only CLOSED sessions to avoid NOW() inflating phone time
    const csSub = `
      SELECT
        cs.user_id,
        DATE(cs.start_time) AS date,
        MIN(cs.start_time) AS login_time,
        MAX(COALESCE(cs.end_time, NOW())) AS logout_time,
        -- Cap at working span to prevent multi-camera double-counting
        LEAST(
          SUM(CASE WHEN COALESCE(c.camera_type,'work_area') IN ('work_area','meeting_room','reception')
              THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time,NOW()) - cs.start_time))
                   * (1 - LEAST(CASE WHEN cs.total_frame_count > 0
                                THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
              ELSE 0 END),
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time,NOW())) - MIN(cs.start_time)))
        )::int AS productive_seconds,
        LEAST(
          SUM(EXTRACT(EPOCH FROM (COALESCE(cs.end_time,NOW()) - cs.start_time))),
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time,NOW())) - MIN(cs.start_time)))
        )::int AS camera_seconds,
        SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.phone_seen_count   ELSE 0 END) AS phone_seen_count,
        SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count  ELSE 0 END) AS total_frame_count,
        CASE
          WHEN SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count ELSE 0 END) > 0
          THEN ROUND((
            SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.phone_seen_count  ELSE 0 END)::float
            / SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count ELSE 0 END) * 100
          )::numeric, 1)
          ELSE 0
        END AS phone_pct,
        -- phone_seconds = phone_ratio × capped camera span (avoids multi-camera inflation)
        ROUND(
          CASE WHEN SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count ELSE 0 END) > 0
          THEN (
            SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.phone_seen_count ELSE 0 END)::float
            / SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count ELSE 0 END)
          ) * LEAST(
            SUM(EXTRACT(EPOCH FROM (COALESCE(cs.end_time,NOW()) - cs.start_time))),
            EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time,NOW())) - MIN(cs.start_time)))
          )
          ELSE 0 END
        )::int AS phone_seconds
      FROM camera_sessions cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE DATE(cs.start_time) BETWEEN $1 AND $2
      GROUP BY cs.user_id, DATE(cs.start_time)
    `;

    // LATERAL: resolve each user's active shift for the attendance date
    const shiftLateral = `
      LEFT JOIN LATERAL (
        SELECT
          s.start_time                        AS shift_start,
          s.end_time                          AS shift_end,
          s.entry_deadline                    AS entry_deadline,
          s.ot_cutoff_time                    AS ot_cutoff_time,
          COALESCE(s.grace_minutes, 0)::int   AS grace_minutes,
          s.work_days                         AS work_days
        FROM user_shifts us
        JOIN shifts s ON s.id = us.shift_id
        WHERE us.user_id = u.id
          AND us.from_date <= cs_day.date
          AND (us.to_date IS NULL OR us.to_date >= cs_day.date)
          AND s.status = 'Active'
        ORDER BY us.from_date DESC
        LIMIT 1
      ) sh ON TRUE
    `;

    // Summary: LEFT JOIN so ALL active users appear — absent users have cs_day.* = NULL
    // LATERAL resolves each user's shift so we can count late arrivals and overtime
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT u.id)                       AS total,
        COUNT(DISTINCT cs_day.user_id)             AS present_count,
        COUNT(DISTINCT u.id)
          - COUNT(DISTINCT cs_day.user_id)         AS absent_count,
        COUNT(*) FILTER (WHERE a.status = 'Half Day')  AS half_day_count,
        COUNT(*) FILTER (WHERE a.status = 'On Leave')  AS on_leave_count,
        COUNT(DISTINCT CASE
          WHEN cs_day.login_time IS NOT NULL
            AND sh.shift_start IS NOT NULL
            AND (cs_day.login_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
                > COALESCE(sh.entry_deadline, sh.shift_start) + MAKE_INTERVAL(mins => sh.grace_minutes)
          THEN u.id END
        ) AS late_count,
        COUNT(DISTINCT CASE
          WHEN cs_day.logout_time IS NOT NULL
            AND sh.shift_end IS NOT NULL
            AND (cs_day.logout_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
                > sh.shift_end
          THEN u.id END
        ) AS overtime_count,
        COUNT(DISTINCT CASE WHEN hol_s.id IS NOT NULL THEN cs_day.user_id END) AS holiday_count,
        COUNT(DISTINCT CASE
          WHEN hol_s.id IS NULL
            AND sh.work_days IS NOT NULL
            AND NOT (EXTRACT(ISODOW FROM cs_day.date)::int = ANY(sh.work_days))
          THEN cs_day.user_id END
        ) AS week_off_count
      FROM users u
      LEFT JOIN (${csSub}) cs_day ON cs_day.user_id = u.id
      LEFT JOIN attendances a ON a.user_id = u.id AND a.date = cs_day.date
      LEFT JOIN LATERAL (
        SELECT
          s.start_time                        AS shift_start,
          s.end_time                          AS shift_end,
          s.entry_deadline                    AS entry_deadline,
          s.ot_cutoff_time                    AS ot_cutoff_time,
          COALESCE(s.grace_minutes, 0)::int   AS grace_minutes,
          s.work_days                         AS work_days
        FROM user_shifts us
        JOIN shifts s ON s.id = us.shift_id
        WHERE us.user_id = u.id
          AND us.from_date <= cs_day.date
          AND (us.to_date IS NULL OR us.to_date >= cs_day.date)
          AND s.status = 'Active'
        ORDER BY us.from_date DESC
        LIMIT 1
      ) sh ON TRUE
      LEFT JOIN holidays hol_s ON hol_s.date = cs_day.date
      WHERE ${summaryWhereSQL}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users u
      JOIN (${csSub}) cs_day ON cs_day.user_id = u.id
      LEFT JOIN attendances a ON a.user_id = u.id AND a.date = cs_day.date
      WHERE ${outerWhereSQL}
    `;

    const dataQuery = `
      SELECT
        a.id,
        u.id         AS user_id,
        u.name       AS user_name,
        u.department,
        cs_day.date,
        cs_day.login_time,
        cs_day.logout_time,
        MAKE_INTERVAL(secs =>
          EXTRACT(EPOCH FROM (cs_day.logout_time - cs_day.login_time))::int
        ) AS working_hours,
        MAKE_INTERVAL(secs => cs_day.productive_seconds) AS productive_hours,
        cs_day.camera_seconds,
        cs_day.phone_pct,
        cs_day.phone_seconds,
        cs_day.phone_seen_count,
        cs_day.total_frame_count,
        CASE WHEN sh.shift_start IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            (cs_day.login_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
            - (COALESCE(sh.entry_deadline, sh.shift_start) + MAKE_INTERVAL(mins => sh.grace_minutes))
          )) / 60)::int
          ELSE COALESCE(a.late_minutes, 0)
        END AS late_minutes,
        CASE WHEN sh.shift_end IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            sh.shift_end - (cs_day.logout_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
          )) / 60)::int
          ELSE COALESCE(a.early_exit_minutes, 0)
        END AS early_exit_minutes,
        CASE WHEN sh.shift_end IS NOT NULL
          THEN GREATEST(0,
            LEAST(
              EXTRACT(EPOCH FROM (
                (cs_day.logout_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
                - sh.shift_end
              )) / 60,
              COALESCE(
                CASE WHEN sh.ot_cutoff_time = '00:00:00'::time
                  THEN EXTRACT(EPOCH FROM ('24:00:00'::interval - sh.shift_end::interval)) / 60
                  ELSE EXTRACT(EPOCH FROM (sh.ot_cutoff_time::interval - sh.shift_end::interval)) / 60
                END,
                'Infinity'::float
              )
            )
          )::int
          ELSE COALESCE(a.overtime_minutes, 0)
        END AS overtime_minutes,
        INITCAP(COALESCE(a.status, 'Present')) AS status,
        a.remarks,
        a.in_camera_track_id,
        a.out_camera_track_id,
        hol.name AS holiday_name,
        hol.type AS holiday_type,
        (hol.id IS NOT NULL) AS is_holiday,
        (
          sh.work_days IS NOT NULL
          AND NOT (EXTRACT(ISODOW FROM cs_day.date)::int = ANY(sh.work_days))
        ) AS is_week_off
      FROM users u
      JOIN (${csSub}) cs_day ON cs_day.user_id = u.id
      LEFT JOIN attendances a  ON a.user_id  = u.id AND a.date = cs_day.date
      LEFT JOIN holidays hol   ON hol.date   = cs_day.date
      ${shiftLateral}
      WHERE ${outerWhereSQL}
      ORDER BY ${
        filters.sort_by === "productive" ? `cs_day.productive_seconds ${(filters.sort_dir || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC"}, u.name` :
        filters.sort_by === "working"    ? `cs_day.camera_seconds ${(filters.sort_dir || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC"}, u.name` :
        filters.sort_by === "name"       ? `u.name ${(filters.sort_dir || "asc").toUpperCase() === "DESC" ? "DESC" : "ASC"}` :
        "cs_day.date DESC, u.name"
      }
      LIMIT $${pi} OFFSET $${pi + 1}
    `;

    const [summaryRows, countRows, rows] = await Promise.all([
      db.query(summaryQuery, summaryParams),
      db.query(countQuery,   params),
      db.query(dataQuery,    [...params, limit, offset]),
    ]);

    const summaryRow = summaryRows?.[0] ?? {};
    const countRow   = countRows?.[0]   ?? {};
    const total      = Number(countRow.total ?? 0);

    return {
      summary: {
        total:    Number(summaryRow.total          ?? 0),
        present:  Number(summaryRow.present_count  ?? 0),
        absent:   Number(summaryRow.absent_count   ?? 0),
        half_day: Number(summaryRow.half_day_count ?? 0),
        on_leave: Number(summaryRow.on_leave_count ?? 0),
        late:     Number(summaryRow.late_count     ?? 0),
        overtime: Number(summaryRow.overtime_count ?? 0),
        holiday:  Number(summaryRow.holiday_count  ?? 0),
        week_off: Number(summaryRow.week_off_count ?? 0),
      },
      rows: (rows ?? []).map((row) => ({
        ...row,
        late_minutes:        Number(row.late_minutes        ?? 0),
        early_exit_minutes:  Number(row.early_exit_minutes  ?? 0),
        overtime_minutes:    Number(row.overtime_minutes    ?? 0),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  },

  getOne: async (db, id) => {
    const query = `
      SELECT
        a.id,
        a.user_id,
        u.name AS user_name,
        a.date,
        a.login_time,
        a.logout_time,
        a.working_hours,
        a.productive_hours,
        a.late_minutes,
        a.early_exit_minutes,
        a.overtime_minutes,
        a.status,
        a.remarks,
        a.in_camera_track_id,
        a.out_camera_track_id,
        a.created_at,
        a.updated_at,

        ict.session_uid AS in_track_uid,
        ict.image_path AS in_image_path,
        ict.start_time AS in_track_start_time,

        oct.session_uid AS out_track_uid,
        oct.image_path AS out_image_path,
        oct.start_time AS out_track_start_time
      FROM attendances a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN camera_sessions ict ON ict.id = a.in_camera_track_id
      LEFT JOIN camera_sessions oct ON oct.id = a.out_camera_track_id
      WHERE a.id = $1
      LIMIT 1
    `;

    const result = await db.query(query, [id]);
    return result?.[0] || null;
  },

  updateOne: async (db, id, payload = {}, user = null) => {
    const existing = await db.query(
      `SELECT * FROM attendances WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!existing?.[0]) {
      return null;
    }

    const allowedFields = [
      "date",
      "login_time",
      "logout_time",
      "status",
      "remarks",
      "in_camera_track_id",
      "out_camera_track_id",
      "late_minutes",
      "early_exit_minutes",
      "overtime_minutes",
      "working_hours",
      "productive_hours",
    ];

    const updates = [];
    const values = [];
    let i = 1;

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updates.push(`${field} = $${i}`);
        values.push(payload[field]);
        i++;
      }
    }

    if (user?.id) {
      updates.push(`updated_by = $${i}`);
      values.push(user.id);
      i++;
    }

    updates.push(`updated_at = NOW()`);

    if (!updates.length) {
      const current = await db.query(
        `
        SELECT
          a.id,
          a.user_id,
          u.name AS user_name,
          a.date,
          a.login_time,
          a.logout_time,
          a.working_hours,
          a.productive_hours,
          a.late_minutes,
          a.early_exit_minutes,
          a.overtime_minutes,
          a.status,
          a.remarks,
          a.in_camera_track_id,
          a.out_camera_track_id,
          a.created_at,
          a.updated_at
        FROM attendances a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.id = $1
        LIMIT 1
        `,
        [id]
      );

      return current?.[0] || null;
    }

    values.push(id);

    await db.query(
      `
      UPDATE attendances
      SET ${updates.join(", ")}
      WHERE id = $${i}
      `,
      values
    );

    const updated = await db.query(
      `
      SELECT
        a.id,
        a.user_id,
        u.name AS user_name,
        a.date,
        a.login_time,
        a.logout_time,
        a.working_hours,
        a.productive_hours,
        a.late_minutes,
        a.early_exit_minutes,
        a.overtime_minutes,
        a.status,
        a.remarks,
        a.in_camera_track_id,
        a.out_camera_track_id,
        a.created_at,
        a.updated_at
      FROM attendances a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = $1
      LIMIT 1
      `,
      [id]
    );

    return updated?.[0] || null;
  },

  exportData: async (db, filters = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = filters.from || today;
    const to   = filters.to   || from;

    const params = [from, to];
    let pi = 3;
    const where = [`u.status = 'Active'`, `u.deleted_at IS NULL`, `LOWER(u.type) = 'staff'`];

    if (filters.user_id) { where.push(`u.id = $${pi++}`); params.push(filters.user_id); }
    if (filters.search)  { where.push(`COALESCE(u.name, '') ILIKE $${pi++}`); params.push(`%${filters.search}%`); }
    if (filters.status)  { where.push(`COALESCE(a.status, 'Present') = $${pi++}`); params.push(filters.status); }

    const whereSQL = where.join(" AND ");

    // Same camera_sessions subquery as getData — one row per user per day
    const csSub = `
      SELECT
        cs.user_id,
        DATE(cs.start_time) AS date,
        MIN(cs.start_time)  AS login_time,
        MAX(COALESCE(cs.end_time, NOW())) AS logout_time,
        LEAST(
          SUM(CASE WHEN COALESCE(c.camera_type,'work_area') IN ('work_area','meeting_room','reception')
              THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time,NOW()) - cs.start_time))
                   * (1 - LEAST(CASE WHEN cs.total_frame_count > 0
                                THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
              ELSE 0 END),
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time,NOW())) - MIN(cs.start_time)))
        )::int AS productive_seconds,
        LEAST(
          SUM(EXTRACT(EPOCH FROM (COALESCE(cs.end_time,NOW()) - cs.start_time))),
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time,NOW())) - MIN(cs.start_time)))
        )::int AS camera_seconds,
        CASE WHEN SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count ELSE 0 END) > 0
          THEN ROUND((
            SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.phone_seen_count ELSE 0 END)::float
            / SUM(CASE WHEN cs.end_time IS NOT NULL THEN cs.total_frame_count ELSE 0 END) * 100
          )::numeric, 1)
          ELSE 0 END AS phone_pct
      FROM camera_sessions cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE DATE(cs.start_time) BETWEEN $1 AND $2
      GROUP BY cs.user_id, DATE(cs.start_time)
    `;

    const shiftLateral = `
      LEFT JOIN LATERAL (
        SELECT s.start_time AS shift_start, s.end_time AS shift_end,
               s.entry_deadline AS entry_deadline,
               s.ot_cutoff_time AS ot_cutoff_time,
               COALESCE(s.grace_minutes, 0)::int AS grace_minutes,
               s.work_days AS work_days
        FROM user_shifts us
        JOIN shifts s ON s.id = us.shift_id
        WHERE us.user_id = u.id
          AND us.from_date <= cs_day.date
          AND (us.to_date IS NULL OR us.to_date >= cs_day.date)
          AND s.status = 'Active'
        ORDER BY us.from_date DESC LIMIT 1
      ) sh ON TRUE
    `;

    const query = `
      SELECT
        u.name                                                      AS "Employee Name",
        TO_CHAR(cs_day.date, 'YYYY-MM-DD')                         AS "Date",
        TO_CHAR(cs_day.login_time  AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') AS "Login Time",
        TO_CHAR(cs_day.logout_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') AS "Logout Time",
        TO_CHAR(MAKE_INTERVAL(secs =>
          EXTRACT(EPOCH FROM (cs_day.logout_time - cs_day.login_time))::int
        ), 'HH24:MI')                                              AS "Working Hours",
        TO_CHAR(MAKE_INTERVAL(secs => cs_day.productive_seconds), 'HH24:MI') AS "Productive Hours",
        cs_day.phone_pct                                            AS "Phone Usage %",
        CASE WHEN sh.shift_start IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            (cs_day.login_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
            - (COALESCE(sh.entry_deadline, sh.shift_start) + MAKE_INTERVAL(mins => sh.grace_minutes))
          )) / 60)::int
          ELSE COALESCE(a.late_minutes, 0) END                     AS "Late (mins)",
        CASE WHEN sh.shift_end IS NOT NULL
          THEN GREATEST(0, EXTRACT(EPOCH FROM (
            sh.shift_end - (cs_day.logout_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time
          )) / 60)::int
          ELSE COALESCE(a.early_exit_minutes, 0) END               AS "Early Exit (mins)",
        CASE WHEN sh.shift_end IS NOT NULL
          THEN GREATEST(0,
            LEAST(
              EXTRACT(EPOCH FROM (
                (cs_day.logout_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time - sh.shift_end
              )) / 60,
              COALESCE(
                CASE WHEN sh.ot_cutoff_time = '00:00:00'::time
                  THEN EXTRACT(EPOCH FROM ('24:00:00'::interval - sh.shift_end::interval)) / 60
                  ELSE EXTRACT(EPOCH FROM (sh.ot_cutoff_time::interval - sh.shift_end::interval)) / 60
                END,
                'Infinity'::float
              )
            )
          )::int
          ELSE COALESCE(a.overtime_minutes, 0) END                 AS "Overtime (mins)",
        INITCAP(COALESCE(a.status, 'Present'))                     AS "Status",
        COALESCE(a.remarks, '')                                     AS "Remarks"
      FROM users u
      JOIN (${csSub}) cs_day ON cs_day.user_id = u.id
      LEFT JOIN attendances a ON a.user_id = u.id AND a.date = cs_day.date
      ${shiftLateral}
      WHERE ${whereSQL}
      ORDER BY cs_day.date DESC, u.name
    `;

    const result = await db.query(query, params);

    const parser = new Parser({
      fields: [
        "Employee Name", "Date", "Login Time", "Logout Time",
        "Working Hours", "Productive Hours", "Phone Usage %",
        "Late (mins)", "Early Exit (mins)", "Overtime (mins)",
        "Status", "Remarks",
      ],
    });

    return parser.parse(result || []);
  },

  getMonthly: async (db, filters = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    const month = filters.month || today.slice(0, 7);
    const monthDate = `${month}-01`;

    const params = [monthDate];
    let pi = 2;
    const where = [`u.status = 'Active'`, `u.deleted_at IS NULL`, `LOWER(u.type) = 'staff'`];
    if (filters.search) {
      where.push(`COALESCE(u.name, '') ILIKE $${pi++}`);
      params.push(`%${filters.search}%`);
    }
    const whereSQL = where.join(" AND ");

    const rows = await db.query(`
      WITH
        month_bounds AS (
          SELECT
            date_trunc('month', $1::date)::date                                         AS start_d,
            LEAST(
              (date_trunc('month', $1::date) + interval '1 month' - interval '1 day')::date,
              CURRENT_DATE
            )                                                                            AS end_d,
            (date_trunc('month', $1::date) + interval '1 month' - interval '1 day')::date AS full_end_d
        ),
        date_series AS (
          SELECT generate_series(b.start_d, b.end_d, '1 day'::interval)::date AS day
          FROM month_bounds b
        ),
        sessions AS (
          SELECT DISTINCT cs.user_id, DATE(cs.start_time) AS day
          FROM camera_sessions cs, month_bounds b
          WHERE DATE(cs.start_time) >= b.start_d
            AND DATE(cs.start_time) <= b.end_d
        ),
        hols AS (
          SELECT h.date FROM holidays h, month_bounds b
          WHERE h.date >= b.start_d AND h.date <= b.full_end_d
        )
      SELECT
        u.id                                                                   AS user_id,
        u.name                                                                 AS user_name,
        COALESCE(u.department, '')                                             AS department,
        jsonb_object_agg(
          EXTRACT(DAY FROM ds.day)::text,
          CASE
            WHEN hol.date  IS NOT NULL THEN 'H'
            WHEN sh.work_days IS NOT NULL
              AND NOT (EXTRACT(ISODOW FROM ds.day)::int = ANY(sh.work_days)) THEN 'W'
            WHEN s.user_id IS NOT NULL THEN 'P'
            ELSE 'A'
          END
        )                                                                      AS days,
        COUNT(*) FILTER (WHERE s.user_id IS NOT NULL)                                           AS present,
        COUNT(*) FILTER (WHERE s.user_id IS NULL AND hol.date IS NULL
          AND (sh.work_days IS NULL OR EXTRACT(ISODOW FROM ds.day)::int = ANY(sh.work_days)))   AS absent,
        COUNT(*) FILTER (WHERE hol.date IS NOT NULL)                                            AS holidays,
        COUNT(*) FILTER (WHERE hol.date IS NULL AND sh.work_days IS NOT NULL
          AND NOT (EXTRACT(ISODOW FROM ds.day)::int = ANY(sh.work_days)))                       AS week_offs
      FROM users u
      CROSS JOIN date_series ds
      LEFT JOIN sessions s   ON s.user_id = u.id AND s.day = ds.day
      LEFT JOIN hols hol     ON hol.date = ds.day
      LEFT JOIN LATERAL (
        SELECT sft.work_days
        FROM user_shifts us2
        JOIN shifts sft ON sft.id = us2.shift_id
        WHERE us2.user_id = u.id
          AND us2.from_date <= ds.day
          AND (us2.to_date IS NULL OR us2.to_date >= ds.day)
          AND sft.status = 'Active'
        ORDER BY us2.from_date DESC
        LIMIT 1
      ) sh ON TRUE
      WHERE ${whereSQL}
      GROUP BY u.id, u.name, u.department
      ORDER BY u.name
    `, params);

    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const isCurrentMonth = month === today.slice(0, 7);
    const dataThroughDay = isCurrentMonth ? new Date(today).getDate() : daysInMonth;

    return {
      month,
      days_in_month: daysInMonth,
      data_through_day: dataThroughDay,
      employees: (rows || []).map(r => ({
        ...r,
        present:   Number(r.present),
        absent:    Number(r.absent),
        holidays:  Number(r.holidays),
        week_offs: Number(r.week_offs),
      })),
    };
  },

  getTracksByAttendance: async (db, attendanceId) => {
    const attendanceQuery = `
    SELECT
      a.id,
      a.user_id,
      a.date,
      a.in_camera_session_id AS in_camera_track_id,
      a.out_camera_session_id AS out_camera_track_id,
      u.name AS user_name
    FROM attendances a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.id = $1
    LIMIT 1
  `;

    const attendanceRows = await db.query(attendanceQuery, [attendanceId]);
    const attendance = attendanceRows?.[0];

    if (!attendance) return null;

    const tracksQuery = `
    SELECT
      ct.id,
      ct.session_uid AS track_id,
      ct.camera_id,
      c.name AS camera_name,
      ct.user_id,
      u.name AS user_name,
      ct.unknown_face_id,
      ct.confidence,
      ct.start_time,
      ct.end_time,
      ct.status,
      ct.image_path,
      EXTRACT(EPOCH FROM (COALESCE(ct.end_time, NOW()) - ct.start_time))::int AS duration_seconds
    FROM camera_sessions ct
    LEFT JOIN users u ON u.id = ct.user_id
    LEFT JOIN cameras c ON c.id = ct.camera_id
    WHERE ct.user_id = $1
      AND DATE(ct.start_time) = $2
    ORDER BY ct.start_time ASC
  `;

    const tracks = await db.query(tracksQuery, [attendance.user_id, attendance.date]);

    return {
      attendance,
      tracks: (tracks || []).map((track) => ({
        ...track,
        is_in_track: attendance.in_camera_session_id === track.id,
        is_out_track: attendance.out_camera_session_id === track.id,
      })),
    };
  },
};