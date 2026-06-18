export const LocationService = {
  upsertLocation: async (db, userId, data) => {
    const {
      latitude, longitude, accuracy,
      wifi_ssid, network_type,
      is_developer_mode, walk_distance_m,
      other_app_opens, app_opens_detail, device_id
    } = data;

    const detail = app_opens_detail
      ? (typeof app_opens_detail === 'string' ? JSON.parse(app_opens_detail) : app_opens_detail)
      : {};

    // 1. Upsert latest position (one row per user)
    const result = await db.query(`
      INSERT INTO employee_locations
        (user_id, latitude, longitude, accuracy, wifi_ssid, network_type,
         is_developer_mode, walk_distance_m, other_app_opens, app_opens_detail,
         device_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        latitude          = EXCLUDED.latitude,
        longitude         = EXCLUDED.longitude,
        accuracy          = EXCLUDED.accuracy,
        wifi_ssid         = EXCLUDED.wifi_ssid,
        network_type      = EXCLUDED.network_type,
        is_developer_mode = EXCLUDED.is_developer_mode,
        walk_distance_m   = EXCLUDED.walk_distance_m,
        other_app_opens   = EXCLUDED.other_app_opens,
        app_opens_detail  = EXCLUDED.app_opens_detail,
        device_id         = EXCLUDED.device_id,
        updated_at        = NOW()
      RETURNING *
    `, [
      userId,
      latitude,
      longitude,
      accuracy ?? null,
      wifi_ssid ?? null,
      network_type ?? null,
      is_developer_mode ?? false,
      walk_distance_m ?? 0,
      other_app_opens ?? 0,
      detail,
      device_id ?? null
    ]);

    // 2. Append to full history (fire-and-forget)
    db.query(`
      INSERT INTO location_logs
        (user_id, device_id, latitude, longitude, accuracy, wifi_ssid, network_type,
         is_developer_mode, walk_distance_m, other_app_opens, app_opens_detail, logged_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [
      userId,
      device_id ?? null,
      latitude,
      longitude,
      accuracy ?? null,
      wifi_ssid ?? null,
      network_type ?? null,
      is_developer_mode ?? false,
      walk_distance_m ?? 0,
      other_app_opens ?? 0,
      detail
    ]).catch(() => {});

    // TypeORM db.query() returns rows as a plain array (not {rows: []})
    return (result || [])[0];
  },

  getLocationsByUserId: async (db, userId) => {
    const result = await db.query(`
      SELECT
        el.id, el.user_id, el.device_id, el.latitude, el.longitude,
        el.accuracy, el.wifi_ssid, el.network_type, el.is_developer_mode,
        el.walk_distance_m, el.other_app_opens, el.app_opens_detail, el.updated_at,
        u.name AS user_name, u.code AS employee_code, u.avatar
      FROM employee_locations el
      JOIN users u ON u.id = el.user_id
      WHERE el.user_id = $1 AND u.deleted_at IS NULL
    `, [userId]);
    return result || [];
  },

  getAllLocations: async (db) => {
    const result = await db.query(`
      SELECT
        el.id,
        el.user_id,
        el.device_id,
        el.latitude,
        el.longitude,
        el.accuracy,
        el.wifi_ssid,
        el.network_type,
        el.is_developer_mode,
        el.walk_distance_m,
        el.other_app_opens,
        el.app_opens_detail,
        el.updated_at,
        u.name  AS user_name,
        u.code  AS employee_code,
        u.avatar
      FROM employee_locations el
      JOIN users u ON u.id = el.user_id
      WHERE u.deleted_at IS NULL
      ORDER BY el.updated_at DESC
    `);
    return result || [];
  },

  getLocationLogs: async (db, { userId, from, to, limit = 500 } = {}) => {
    const conditions = ['u.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (userId) {
      conditions.push(`ll.user_id = $${idx++}`);
      params.push(userId);
    }
    if (from) {
      conditions.push(`ll.logged_at >= $${idx++}`);
      params.push(new Date(from));
    }
    if (to) {
      conditions.push(`ll.logged_at <= $${idx++}`);
      params.push(new Date(to));
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    params.push(Math.min(Number(limit) || 500, 2000));

    const result = await db.query(`
      SELECT
        ll.id,
        ll.user_id,
        ll.device_id,
        ll.latitude,
        ll.longitude,
        ll.accuracy,
        ll.wifi_ssid,
        ll.network_type,
        ll.is_developer_mode,
        ll.walk_distance_m,
        ll.other_app_opens,
        ll.app_opens_detail,
        ll.logged_at,
        u.name AS user_name,
        u.code AS employee_code,
        u.department
      FROM location_logs ll
      JOIN users u ON u.id = ll.user_id
      ${where}
      ORDER BY ll.logged_at DESC
      LIMIT $${idx}
    `, params);

    return result || [];
  },

  exportLocationLogs: async (db, { from, to, userId } = {}) => {
    const conditions = ['u.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (userId) {
      conditions.push(`ll.user_id = $${idx++}`);
      params.push(userId);
    }
    if (from) {
      conditions.push(`ll.logged_at >= $${idx++}`);
      params.push(new Date(from));
    }
    if (to) {
      conditions.push(`ll.logged_at <= $${idx++}`);
      params.push(new Date(to));
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(`
      SELECT
        ll.logged_at,
        u.name        AS employee_name,
        u.code        AS employee_code,
        u.department,
        ll.device_id,
        ll.latitude,
        ll.longitude,
        ll.accuracy,
        ll.wifi_ssid,
        ll.network_type,
        ll.is_developer_mode,
        ll.walk_distance_m,
        ll.other_app_opens,
        ll.app_opens_detail
      FROM location_logs ll
      JOIN users u ON u.id = ll.user_id
      ${where}
      ORDER BY ll.logged_at DESC
      LIMIT 10000
    `, params);

    const rows = result || [];

    const header = [
      'Timestamp', 'Employee Name', 'Employee Code', 'Department',
      'Device ID', 'Latitude', 'Longitude', 'Accuracy (m)',
      'Wi-Fi SSID', 'Network Type', 'Developer Mode',
      'Walk Distance (m)', 'Other App Opens', 'Apps Used'
    ].join(',');

    const csvRows = rows.map(r => {
      const appsUsed = r.app_opens_detail
        ? Object.entries(r.app_opens_detail)
            .sort((a, b) => b[1] - a[1])
            .map(([app, n]) => `${app}(${n})`)
            .join('; ')
        : '';
      return [
        new Date(r.logged_at).toISOString(),
        `"${(r.employee_name || '').replace(/"/g, '""')}"`,
        r.employee_code || '',
        `"${(r.department || '').replace(/"/g, '""')}"`,
        r.device_id || '',
        r.latitude,
        r.longitude,
        r.accuracy ?? '',
        `"${(r.wifi_ssid || '').replace(/"/g, '""')}"`,
        r.network_type || '',
        r.is_developer_mode ? 'YES' : 'NO',
        r.walk_distance_m ?? 0,
        r.other_app_opens ?? 0,
        `"${appsUsed.replace(/"/g, '""')}"`
      ].join(',');
    });

    return [header, ...csvRows].join('\n');
  }
};
