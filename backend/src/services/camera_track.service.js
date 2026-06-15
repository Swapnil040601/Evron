import { Parser } from "json2csv";
import { UserService } from "./user.service.js";
import { ShiftService } from "./shift.service.js";

function buildWhere(filters = {}) {
  const where = [];
  const values = [];
  let i = 1;

  const selectedDate = filters.date || new Date().toISOString().slice(0, 10);

  where.push(`DATE(ct.start_time) = $${i}`);
  values.push(selectedDate);
  i++;

  if (filters.camera_id) {
    where.push(`ct.camera_id = $${i}`);
    values.push(filters.camera_id);
    i++;
  }

  if (filters.user_id) {
    where.push(`ct.user_id = $${i}`);
    values.push(filters.user_id);
    i++;
  }

  if (filters.status) {
    where.push(`ct.status = $${i}`);
    values.push(filters.status);
    i++;
  }

  if (filters.identity === "identified") {
    where.push(`ct.user_id IS NOT NULL`);
  }

  if (filters.identity === "unknown") {
    where.push(`ct.user_id IS NULL`);
  }

  if (filters.from_time) {
    where.push(`ct.start_time::time >= $${i}::time`);
    values.push(filters.from_time);
    i++;
  }

  if (filters.to_time) {
    where.push(`ct.start_time::time <= $${i}::time`);
    values.push(filters.to_time);
    i++;
  }

  if (filters.search) {
    where.push(`
        (
          CAST(ct.session_uid AS TEXT) ILIKE $${i}
          OR CAST(ct.unknown_face_id AS TEXT) ILIKE $${i}
          OR COALESCE(u.name, '') ILIKE $${i}
          OR COALESCE(c.name, '') ILIKE $${i}
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

function normalizeVector(embedding) {
  if (!embedding) return null;
  if (Array.isArray(embedding)) {
    return `[${embedding.join(",")}]`;
  }
  return embedding;
}

export const CameraTrackService = {
  getData: async (db, filters = {}) => {
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 20);
    const offset = (page - 1) * limit;

    const { whereSql, values } = buildWhere(filters);

    const summaryQuery = `
      SELECT
        COUNT(*) AS total_tracks,
        COUNT(*) FILTER (WHERE ct.user_id IS NOT NULL) AS identified_tracks,
        COUNT(*) FILTER (WHERE ct.user_id IS NULL) AS unknown_tracks,
        COUNT(*) FILTER (WHERE ct.end_time IS NULL) AS active_tracks,
        COUNT(DISTINCT ct.camera_id) AS camera_count,
        ROUND(COALESCE(AVG(ct.confidence), 0)::numeric, 2) AS avg_confidence
      FROM camera_sessions ct
      LEFT JOIN users u ON u.id = ct.user_id
      LEFT JOIN cameras c ON c.id = ct.camera_id
      ${whereSql}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM camera_sessions ct
      LEFT JOIN users u ON u.id = ct.user_id
      LEFT JOIN cameras c ON c.id = ct.camera_id
      ${whereSql}
    `;

    const dataQuery = `
      SELECT
        ct.id,
        ct.session_uid AS track_id,
        ct.camera_id,
        c.name AS camera_name,
        ct.user_id,
        u.name AS user_name,
        u.code AS employee_code,
        ct.unknown_face_id,
        ct.confidence,
        ct.start_time,
        ct.end_time,
        ct.status,
        ct.image_path,
        ct.phone_seen_count,
        ct.total_frame_count,
        CASE WHEN ct.total_frame_count > 0
          THEN ROUND((ct.phone_seen_count::float / ct.total_frame_count * 100)::numeric, 1)
          ELSE 0
        END AS phone_pct,
        EXTRACT(EPOCH FROM (COALESCE(ct.end_time, NOW()) - ct.start_time))::int AS duration_seconds
      FROM camera_sessions ct
      LEFT JOIN users u ON u.id = ct.user_id
      LEFT JOIN cameras c ON c.id = ct.camera_id
      ${whereSql}
      ORDER BY ct.start_time DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const [summaryRows, countRows, rows] = await Promise.all([
      db.query(summaryQuery, values),
      db.query(countQuery, values),
      db.query(dataQuery, [...values, limit, offset]),
    ]);

    const summaryRow = summaryRows?.[0] ?? {};
    const countRow = countRows?.[0] ?? {};
    const dataRows = rows ?? [];

    const total = Number(countRow.total ?? 0);

    return {
      summary: {
        total_tracks: Number(summaryRow.total_tracks ?? 0),
        identified_tracks: Number(summaryRow.identified_tracks ?? 0),
        unknown_tracks: Number(summaryRow.unknown_tracks ?? 0),
        active_tracks: Number(summaryRow.active_tracks ?? 0),
        camera_count: Number(summaryRow.camera_count ?? 0),
        avg_confidence: Number(summaryRow.avg_confidence ?? 0),
      },
      rows: dataRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  },

  getDailyVisitors: async (db, date) => {
    const selectedDate = date || new Date().toISOString().slice(0, 10);

    const query = `
      WITH visitors AS (
        SELECT
          ct.user_id,
          u.name            AS user_name,
          u.type            AS user_type,
          u.department,
          u.code,
          NULL::bigint      AS unknown_face_id,
          MIN(ct.start_time) AS first_seen,
          MAX(COALESCE(ct.end_time, NOW())) AS last_seen,
          COUNT(DISTINCT ct.camera_id)::int AS camera_count,
          SUM(EXTRACT(EPOCH FROM (COALESCE(ct.end_time, NOW()) - ct.start_time)))::int AS total_seconds,
          COUNT(ct.id)::int AS track_count,
          MIN(ct.image_path) FILTER (WHERE ct.image_path IS NOT NULL) AS image_path
        FROM camera_sessions ct
        LEFT JOIN users u ON u.id = ct.user_id
        WHERE ct.user_id IS NOT NULL AND DATE(ct.start_time AT TIME ZONE 'Asia/Kolkata') = $1
        GROUP BY ct.user_id, u.name, u.type, u.department, u.code

        UNION ALL

        SELECT
          NULL::bigint      AS user_id,
          NULL::varchar     AS user_name,
          NULL::varchar     AS user_type,
          NULL::varchar     AS department,
          NULL::varchar     AS code,
          ct.unknown_face_id,
          MIN(ct.start_time) AS first_seen,
          MAX(COALESCE(ct.end_time, NOW())) AS last_seen,
          COUNT(DISTINCT ct.camera_id)::int AS camera_count,
          SUM(EXTRACT(EPOCH FROM (COALESCE(ct.end_time, NOW()) - ct.start_time)))::int AS total_seconds,
          COUNT(ct.id)::int AS track_count,
          MIN(ct.image_path) FILTER (WHERE ct.image_path IS NOT NULL) AS image_path
        FROM camera_sessions ct
        WHERE ct.user_id IS NULL
          AND ct.unknown_face_id IS NOT NULL
          AND DATE(ct.start_time AT TIME ZONE 'Asia/Kolkata') = $1
        GROUP BY ct.unknown_face_id
      )
      SELECT * FROM visitors ORDER BY first_seen
    `;

    const rows = await db.query(query, [selectedDate]);

    const known   = (rows || []).filter(r => r.user_id != null).length;
    const unknown = (rows || []).filter(r => r.user_id == null).length;

    return {
      date: selectedDate,
      summary: { total: (rows || []).length, known, unknown },
      rows: rows || [],
    };
  },

  getOne: async (db, id) => {
    const query = `
      SELECT
        ct.id,
        ct.session_uid AS track_id,
        ct.camera_id,
        c.name AS camera_name,
        ct.user_id,
        u.name AS user_name,
        u.code AS employee_code,
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
      WHERE ct.id = $1
      LIMIT 1
    `;

    const result = await db.query(query, [id]);
    return result?.[0] || null;
  },

  exportData: async (db, filters = {}) => {
    const { whereSql, values } = buildWhere(filters);

    const query = `
      SELECT
        ct.id,
        ct.session_uid AS track_id,
        c.name AS camera_name,
        u.name AS user_name,
        u.code AS employee_code,
        ct.unknown_face_id,
        ct.confidence,
        ct.start_time,
        ct.end_time,
        ct.status,
        ct.image_path
      FROM camera_sessions ct
      LEFT JOIN users u ON u.id = ct.user_id
      LEFT JOIN cameras c ON c.id = ct.camera_id
      ${whereSql}
      ORDER BY ct.start_time DESC
    `;

    const result = await db.query(query, values);

    const parser = new Parser({
      fields: [
        "id",
        "session_uid",
        "camera_name",
        "user_name",
        "unknown_face_id",
        "confidence",
        "start_time",
        "end_time",
        "status",
        "image_path",
      ],
    });

    return parser.parse(result || []);
  },

  assignUnknownToUser: async (db, id, payload = {}, currentUser = null) => {
    const sessionRows = await db.query(
      `
      SELECT
        ct.id,
        ct.session_uid,
        ct.camera_id,
        ct.user_id,
        ct.unknown_face_id,
        ct.confidence,
        ct.start_time,
        ct.end_time,
        ct.image_path,
        uf.embedding AS unknown_embedding,
        uf.image_path AS unknown_image_path
      FROM camera_sessions ct
      LEFT JOIN unknown_faces uf ON uf.id = ct.unknown_face_id
      WHERE ct.id = $1
      LIMIT 1
      `,
      [id]
    );

    const session = sessionRows?.[0];
    if (!session) {
      throw new Error("Track not found");
    }

    // Option 5: make unknown
    if (payload.make_unknown) {
      await db.query(
        `UPDATE camera_sessions SET user_id = NULL, status = 'unknown', updated_on = NOW() WHERE id = $1`,
        [id]
      );
      return await CameraTrackService.getOne(db, id);
    }

    let userId = payload.user_id ? Number(payload.user_id) : null;

    if (!userId && payload.create_user) {
      const user = await UserService.createOne(db, payload.user || {}, currentUser);
      userId = user?.id ? Number(user.id) : null;
    }

    if (!userId) {
      throw new Error("user_id or create_user is required");
    }

    const userRows = await db.query(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (!userRows?.[0]) {
      throw new Error("User not found");
    }

    const validPoses = ["straight", "left", "right", "up", "down", "smile"];
    const embedding = normalizeVector(session.unknown_embedding);
    const imagePath = session.unknown_image_path || session.image_path;

    // Determine if we should register a face pose
    const shouldAddPose = payload.add_pose || payload.pose_only || payload.create_user;
    const selectedPose = payload.create_user
      ? (validPoses.includes(payload.user?.pose) ? payload.user.pose : "straight")
      : (validPoses.includes(payload.pose) ? payload.pose : "straight");

    if (shouldAddPose && embedding && imagePath) {
      await db.query(
        `
        INSERT INTO user_faces (user_id, pose, embedding, image_path, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id, pose)
        DO UPDATE SET
          embedding = EXCLUDED.embedding,
          image_path = EXCLUDED.image_path,
          updated_at = NOW()
        `,
        [userId, selectedPose, embedding, imagePath]
      );
    }

    // Option 3: pose_only — don't reassign the track, just registered the face
    if (payload.pose_only) {
      return await CameraTrackService.getOne(db, id);
    }

    if (session.user_id && !payload.reassign && !payload.create_user) {
      throw new Error("Track is already assigned");
    }

    if (session.unknown_face_id) {
      await db.query(
        `
        UPDATE camera_sessions
        SET user_id = $1,
            status = 'assigned',
            updated_on = NOW()
        WHERE unknown_face_id = $2
          AND user_id IS NULL
        `,
        [userId, session.unknown_face_id]
      );
    } else {
      await db.query(
        `
        UPDATE camera_sessions
        SET user_id = $1,
            status = 'assigned',
            updated_on = NOW()
        WHERE id = $2
        `,
        [userId, id]
      );
    }

    await db.query(
      `
      INSERT INTO attendances (
        user_id,
        date,
        login_time,
        logout_time,
        in_camera_session_id,
        out_camera_session_id,
        working_hours,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        DATE($2),
        $2,
        COALESCE($3, $2),
        $4,
        $4,
        (COALESCE($3, $2) - $2),
        'present',
        $2,
        COALESCE($3, $2)
      )
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        login_time = CASE
          WHEN attendances.login_time IS NULL THEN EXCLUDED.login_time
          WHEN EXCLUDED.login_time < attendances.login_time THEN EXCLUDED.login_time
          ELSE attendances.login_time
        END,
        logout_time = CASE
          WHEN attendances.logout_time IS NULL THEN EXCLUDED.logout_time
          WHEN EXCLUDED.logout_time > attendances.logout_time THEN EXCLUDED.logout_time
          ELSE attendances.logout_time
        END,
        in_camera_session_id = CASE
          WHEN attendances.login_time IS NULL THEN EXCLUDED.in_camera_session_id
          WHEN EXCLUDED.login_time < attendances.login_time THEN EXCLUDED.in_camera_session_id
          ELSE attendances.in_camera_session_id
        END,
        out_camera_session_id = CASE
          WHEN attendances.logout_time IS NULL THEN EXCLUDED.out_camera_session_id
          WHEN EXCLUDED.logout_time > attendances.logout_time THEN EXCLUDED.out_camera_session_id
          ELSE attendances.out_camera_session_id
        END,
        working_hours = (
          CASE
            WHEN attendances.logout_time IS NULL THEN EXCLUDED.logout_time
            WHEN EXCLUDED.logout_time > attendances.logout_time THEN EXCLUDED.logout_time
            ELSE attendances.logout_time
          END
          -
          CASE
            WHEN attendances.login_time IS NULL THEN EXCLUDED.login_time
            WHEN EXCLUDED.login_time < attendances.login_time THEN EXCLUDED.login_time
            ELSE attendances.login_time
          END
        ),
        status = 'present',
        updated_at = EXCLUDED.updated_at
      `,
      [userId, session.start_time, session.end_time, session.id]
    );

    // Compute and store late/early-exit/overtime minutes from the user's shift
    const attendanceDate = session.start_time
      ? new Date(session.start_time).toISOString().slice(0, 10)
      : null;
    if (attendanceDate) {
      const metrics = await ShiftService.computeMetrics(
        db, userId, attendanceDate, session.start_time, session.end_time
      );
      if (metrics) {
        await db.query(
          `UPDATE attendances
           SET late_minutes = $1, early_exit_minutes = $2, overtime_minutes = $3
           WHERE user_id = $4 AND date = $5`,
          [metrics.late_minutes, metrics.early_exit_minutes, 0, userId, attendanceDate]
        );
      }
    }

    return await CameraTrackService.getOne(db, id);
  },
};
