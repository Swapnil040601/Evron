export const LocationService = {
  upsertLocation: async (db, userId, data) => {
    const {
      latitude, longitude, accuracy,
      wifi_ssid, network_type,
      is_developer_mode, walk_distance_m,
      other_app_opens, app_opens_detail
    } = data;

    const result = await db.query(`
      INSERT INTO employee_locations
        (user_id, latitude, longitude, accuracy, wifi_ssid, network_type,
         is_developer_mode, walk_distance_m, other_app_opens, app_opens_detail, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
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
      app_opens_detail ? JSON.parse(app_opens_detail) : {}
    ]);

    return result.rows[0];
  },

  getAllLocations: async (db) => {
    const result = await db.query(`
      SELECT
        el.id,
        el.user_id,
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
    return result.rows;
  }
};
