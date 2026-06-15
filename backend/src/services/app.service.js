import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

export const AppService = {

  configs: async (db) => {
    const configs = {};
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const configPath = path.join(__dirname, "../modelConfigs");

    const files = fs.readdirSync(configPath);

    for (const file of files) {
      if (!file.endsWith(".js")) continue;

      const module = await import(`../modelConfigs/${file}`);
      const config = module.default;

      if (!config.model) continue;

      configs[config.model] = config;
    }

    return {
      version: "v1",
      configs,
    };
  },

  options: async (db) => {
    const nvrs = await db.query(`SELECT id, name, ip FROM nvrs ORDER BY name`).catch(() => []);
    return {
      nvrs: (nvrs || []).map(n => ({ label: `${n.name} (${n.ip})`, value: String(n.id) })),
    };
  },

  dashboardData: async (db, date) => {

    const users = await db.query(`
  SELECT
    u.id,
    u.name,
    INITCAP(COALESCE(a.status,
      CASE WHEN MIN(cs.start_time) IS NOT NULL THEN 'Present' ELSE 'Absent' END
    )) AS status,
    COALESCE(
      LEAST(
        SUM(
          CASE WHEN COALESCE(c.camera_type, 'work_area') IN ('work_area', 'meeting_room', 'reception')
            THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
                 * (1 - LEAST(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
            ELSE 0
          END
        ),
        EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time, NOW())) - MIN(cs.start_time)))
      ) / 3600, 0
    ) AS productive_hours,
    COALESCE(
      (
        LEAST(
          SUM(EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))),
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time, NOW())) - MIN(cs.start_time)))
        )
        -
        LEAST(
          SUM(
            CASE WHEN COALESCE(c.camera_type, 'work_area') IN ('work_area', 'meeting_room', 'reception')
              THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
                   * (1 - LEAST(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
              ELSE 0
            END
          ),
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time, NOW())) - MIN(cs.start_time)))
        )
      ) / 3600, 0
    ) AS non_productive_hours
  FROM users u
  LEFT JOIN attendances a ON a.user_id = u.id AND a.date = $1::date
  LEFT JOIN camera_sessions cs
    ON cs.user_id = u.id
    AND DATE(cs.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = $1::date
  LEFT JOIN cameras c ON c.id = cs.camera_id
  WHERE u.status = 'Active' AND u.deleted_at IS NULL AND LOWER(u.type) = 'staff'
  GROUP BY u.id, u.name, a.status
  ORDER BY u.name
  `, [date])


    const present = users.filter(
      u => (u.status || "").toLowerCase() !== "absent"
    ).length

    const absent = users.length - present

    return {

      summary: {
        totalEmployees: users.length,
        present,
        absent
      },

      users

    }

  },
  dashboardExport: async (db, date) => {
    return db.query(`
      SELECT
        u.name AS user_name,
        INITCAP(COALESCE(a.status,
          CASE WHEN MIN(cs.start_time) IS NOT NULL THEN 'Present' ELSE 'Absent' END
        )) AS status,
        TO_CHAR(MIN(cs.start_time) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') AS first_seen,
        TO_CHAR(MAX(COALESCE(cs.end_time, NOW())) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') AS last_seen,
        COALESCE(ROUND(
          EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time, NOW())) - MIN(cs.start_time))) / 60
        ), 0) AS working_mins,
        COALESCE(ROUND(
          LEAST(
            SUM(
              CASE WHEN COALESCE(c.camera_type, 'work_area') IN ('work_area', 'meeting_room', 'reception')
                THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
                     * (1 - LEAST(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
                ELSE 0
              END
            ),
            EXTRACT(EPOCH FROM (MAX(COALESCE(cs.end_time, NOW())) - MIN(cs.start_time)))
          ) / 60
        ), 0) AS productive_mins,
        COALESCE(ROUND(
          AVG(CASE WHEN cs.total_frame_count > 0
            THEN cs.phone_seen_count::float / cs.total_frame_count * 100
            ELSE 0 END)::numeric, 1
        ), 0) AS phone_pct
      FROM users u
      LEFT JOIN attendances a ON a.user_id = u.id AND a.date = $1::date
      LEFT JOIN camera_sessions cs
        ON cs.user_id = u.id
        AND DATE(cs.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = $1::date
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE u.status = 'Active' AND u.deleted_at IS NULL AND LOWER(u.type) = 'staff'
      GROUP BY u.id, u.name, a.status
      ORDER BY u.name
    `, [date]);
  },

  employeeExport: async (db, user_id, date) => {
    return db.query(`
      SELECT
        c.name AS camera_name,
        c.is_restricted,
        TO_CHAR(cs.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH12:MI AM') AS start_time,
        TO_CHAR(cs.end_time   AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH12:MI AM') AS end_time,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time)) / 3600, 2) AS duration,
        CASE WHEN cs.total_frame_count > 0
          THEN ROUND((cs.phone_seen_count::float / cs.total_frame_count * 100)::numeric, 1)
          ELSE 0 END AS phone_pct
      FROM camera_sessions cs
      LEFT JOIN cameras c ON c.id = cs.camera_id
      WHERE cs.user_id = $1
        AND DATE(cs.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = $2
      ORDER BY cs.start_time
    `, [user_id, date]);
  },

  employeeReport: async (db, user_id, date) => {

    /* USER PROFILE */

    const user = await db.query(`
    SELECT id, name
    FROM users
    WHERE id = $1
  `, [user_id])


    /* SUMMARY */

    const summaryResult = await db.query(`
    SELECT
      COALESCE(SUM(
        CASE WHEN COALESCE(c.camera_type, 'work_area') IN ('work_area', 'meeting_room', 'reception')
          THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
               * (1 - LEAST(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1))
          ELSE 0
        END
      ) / 3600, 0) AS productive_hours,
      COALESCE(SUM(
        CASE WHEN COALESCE(c.camera_type, 'work_area') = 'server_room'
          THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
          WHEN COALESCE(c.camera_type, 'work_area') IN ('work_area', 'meeting_room', 'reception')
          THEN EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time))
               * LEAST(CASE WHEN cs.total_frame_count > 0 THEN cs.phone_seen_count::float / cs.total_frame_count ELSE 0 END, 1)
          ELSE 0
        END
      ) / 3600, 0) AS non_productive_hours
    FROM camera_sessions cs
    LEFT JOIN cameras c ON c.id = cs.camera_id
    WHERE cs.user_id = $1
    AND DATE(cs.start_time) = $2
  `, [user_id, date])


    const summary = summaryResult[0] || {
      productive_hours: 0,
      non_productive_hours: 0
    }


    /* CAMERA PRESENCES */

    const presences = await db.query(`
    SELECT
      c.name AS camera_name,
      c.camera_type,
      c.is_restricted,
      cs.start_time,
      cs.end_time,
      cs.phone_seen_count,
      cs.total_frame_count,
      CASE WHEN cs.total_frame_count > 0
        THEN ROUND((cs.phone_seen_count::float / cs.total_frame_count * 100)::numeric, 1)
        ELSE 0
      END AS phone_pct,
      NULL AS comments,
      ROUND(
        EXTRACT(EPOCH FROM (COALESCE(cs.end_time, NOW()) - cs.start_time)) / 3600,
        2
      ) AS duration
    FROM camera_sessions cs
    LEFT JOIN cameras c ON c.id = cs.camera_id
    WHERE cs.user_id = $1
    AND DATE(cs.start_time) = $2
    ORDER BY cs.start_time
  `, [user_id, date])


    return {

      user: user[0] || null,

      summary,

      presences

    }

  }
};