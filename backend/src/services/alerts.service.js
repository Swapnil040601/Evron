export const AlertsService = {

  getRecent: async (db, filters = {}) => {
    const limit  = Number(filters.limit  || 50);
    const params = [limit];
    const clauses = [];

    if (filters.unread === "true") clauses.push("pa.is_read = false");
    if (filters.type)              { params.push(filters.type); clauses.push(`pa.type = $${params.length}`); }
    if (filters.camera_id)         { params.push(filters.camera_id); clauses.push(`pa.camera_id = $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    // Generate alerts on every fetch so panel always reflects current state
    await AlertsService.generateAttendanceAlerts(db).catch(() => {});
    await AlertsService.generateSecuredAreaAlerts(db).catch(() => {});

    return await db.query(`
      SELECT
        pa.id, pa.type, pa.severity, pa.message,
        pa.camera_id, pa.user_id, pa.data, pa.image_path,
        pa.is_read, pa.created_at,
        c.name AS camera_name,
        u.name AS user_name
      FROM platform_alerts pa
      LEFT JOIN cameras c ON c.id = pa.camera_id
      LEFT JOIN users   u ON u.id = pa.user_id
      ${where}
      ORDER BY pa.created_at DESC
      LIMIT $1
    `, params);
  },

  markRead: async (db, id) => {
    await db.query(`UPDATE platform_alerts SET is_read = true WHERE id = $1`, [id]);
    return { success: true };
  },

  markAllRead: async (db) => {
    await db.query(`UPDATE platform_alerts SET is_read = true WHERE is_read = false`);
    return { success: true };
  },

  unreadCount: async (db) => {
    const rows = await db.query(`SELECT COUNT(*) AS count FROM platform_alerts WHERE is_read = false`);
    return { count: Number(rows?.[0]?.count || 0) };
  },

  // Generate today's attendance-based alerts — idempotent via dedup_key
  generateAttendanceAlerts: async (db) => {
    // Late arrival: first session started after shift_start + grace_minutes
    await db.query(`
      INSERT INTO platform_alerts (type, severity, message, user_id, data, dedup_key)
      SELECT
        'late_arrival',
        CASE WHEN EXTRACT(EPOCH FROM (
          MIN(cs.start_time)::time - (s.start_time + MAKE_INTERVAL(mins => COALESCE(s.grace_minutes, 0)))
        )) / 60 > 30 THEN 'warning' ELSE 'info' END,
        u.name || ' arrived ' ||
          (EXTRACT(EPOCH FROM (
            MIN(cs.start_time)::time - (s.start_time + MAKE_INTERVAL(mins => COALESCE(s.grace_minutes, 0)))
          )) / 60)::int || ' min late',
        u.id,
        jsonb_build_object(
          'shift_start',    s.start_time::text,
          'grace_minutes',  COALESCE(s.grace_minutes, 0)
        ),
        'late_' || u.id || '_' || CURRENT_DATE
      FROM users u
      JOIN user_shifts us ON us.user_id = u.id
        AND us.from_date <= CURRENT_DATE
        AND (us.to_date IS NULL OR us.to_date >= CURRENT_DATE)
      JOIN shifts s ON s.id = us.shift_id AND s.status = 'Active'
      JOIN camera_sessions cs ON cs.user_id = u.id AND DATE(cs.start_time) = CURRENT_DATE
      WHERE u.status = 'Active' AND u.deleted_at IS NULL
      GROUP BY u.id, u.name, s.start_time, s.grace_minutes
      HAVING MIN(cs.start_time)::time >
        s.start_time + MAKE_INTERVAL(mins => COALESCE(s.grace_minutes, 0))
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    `);

    // Absent: no session 2+ hours after shift start
    await db.query(`
      INSERT INTO platform_alerts (type, severity, message, user_id, data, dedup_key)
      SELECT
        'absent',
        'warning',
        u.name || ' has not checked in today',
        u.id,
        jsonb_build_object('shift_start', s.start_time::text),
        'absent_' || u.id || '_' || CURRENT_DATE
      FROM users u
      JOIN user_shifts us ON us.user_id = u.id
        AND us.from_date <= CURRENT_DATE
        AND (us.to_date IS NULL OR us.to_date >= CURRENT_DATE)
      JOIN shifts s ON s.id = us.shift_id AND s.status = 'Active'
      LEFT JOIN camera_sessions cs ON cs.user_id = u.id AND DATE(cs.start_time) = CURRENT_DATE
      WHERE u.status = 'Active' AND u.deleted_at IS NULL
        AND cs.id IS NULL
        AND NOW()::time > s.start_time + MAKE_INTERVAL(hours => 2)
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    `);

    // Early exit: last closed session ended 5+ min before shift end, and shift has ended
    await db.query(`
      INSERT INTO platform_alerts (type, severity, message, user_id, data, dedup_key)
      SELECT
        'early_exit',
        'info',
        u.name || ' left ' ||
          (EXTRACT(EPOCH FROM (s.end_time - MAX(cs.end_time)::time)) / 60)::int || ' min early',
        u.id,
        jsonb_build_object('shift_end', s.end_time::text),
        'early_' || u.id || '_' || CURRENT_DATE
      FROM users u
      JOIN user_shifts us ON us.user_id = u.id
        AND us.from_date <= CURRENT_DATE
        AND (us.to_date IS NULL OR us.to_date >= CURRENT_DATE)
      JOIN shifts s ON s.id = us.shift_id AND s.status = 'Active'
      JOIN camera_sessions cs ON cs.user_id = u.id
        AND DATE(cs.start_time) = CURRENT_DATE
        AND cs.end_time IS NOT NULL
      WHERE u.status = 'Active' AND u.deleted_at IS NULL
        AND NOW()::time > s.end_time
      GROUP BY u.id, u.name, s.end_time
      HAVING MAX(cs.end_time)::time < s.end_time
        AND EXTRACT(EPOCH FROM (s.end_time - MAX(cs.end_time)::time)) / 60 > 5
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    `);

    // Overtime: still present or last session ended 30+ min after shift end
    await db.query(`
      INSERT INTO platform_alerts (type, severity, message, user_id, data, dedup_key)
      SELECT
        'overtime',
        'info',
        u.name || ' worked ' ||
          (EXTRACT(EPOCH FROM (
            MAX(COALESCE(cs.end_time, NOW()))::time - s.end_time
          )) / 60)::int || ' min overtime',
        u.id,
        jsonb_build_object('shift_end', s.end_time::text),
        'overtime_' || u.id || '_' || CURRENT_DATE
      FROM users u
      JOIN user_shifts us ON us.user_id = u.id
        AND us.from_date <= CURRENT_DATE
        AND (us.to_date IS NULL OR us.to_date >= CURRENT_DATE)
      JOIN shifts s ON s.id = us.shift_id AND s.status = 'Active'
      JOIN camera_sessions cs ON cs.user_id = u.id AND DATE(cs.start_time) = CURRENT_DATE
      WHERE u.status = 'Active' AND u.deleted_at IS NULL
      GROUP BY u.id, u.name, s.end_time
      HAVING MAX(COALESCE(cs.end_time, NOW()))::time > s.end_time
        AND EXTRACT(EPOCH FROM (
          MAX(COALESCE(cs.end_time, NOW()))::time - s.end_time
        )) / 60 > 30
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    `);
  },

  generateSecuredAreaAlerts: async (db) => {
    await db.query(`
      INSERT INTO platform_alerts (type, severity, message, user_id, camera_id, image_path, data, dedup_key)
      SELECT
        'secured_area_violation',
        'critical',
        CASE
          WHEN u.id IS NOT NULL
            THEN u.name || ' detected in restricted area — ' || c.name
          ELSE
            'Unknown person detected in restricted area — ' || c.name
        END,
        sav.user_id,
        sav.camera_id,
        sav.image_path,
        jsonb_build_object(
          'user_name',       u.name,
          'user_code',       u.code,
          'department',      u.department,
          'camera_name',     c.name,
          'camera_location', c.location,
          'detected_at',     sav.detected_at::text,
          'is_unknown',      (u.id IS NULL)
        ),
        'sav_' || sav.id
      FROM secured_area_violations sav
      JOIN cameras c ON c.id = sav.camera_id
      LEFT JOIN users u ON u.id = sav.user_id
      WHERE sav.detected_at >= NOW() - INTERVAL '24 hours'
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    `);
  },
};
