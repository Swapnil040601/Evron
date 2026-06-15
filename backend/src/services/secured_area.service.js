export const SecuredAreaService = {

  // All secured cameras with their allowed user count
  getSecuredCameras: async (db) => {
    return await db.query(`
      SELECT
        c.id, c.name, c.camera_type, c.location, c.status,
        COUNT(DISTINCT cau.user_id)::int AS allowed_users_count,
        COUNT(DISTINCT sav.id)::int AS violations_today
      FROM cameras c
      LEFT JOIN camera_allowed_users cau ON cau.camera_id = c.id
      LEFT JOIN secured_area_violations sav ON sav.camera_id = c.id AND DATE(sav.detected_at) = CURRENT_DATE
      WHERE c.is_secured = true AND c.status = 'Active'
      GROUP BY c.id, c.name, c.camera_type, c.location, c.status
      ORDER BY c.name
    `);
  },

  // Allowed users for a camera
  getAllowedUsers: async (db, cameraId) => {
    return await db.query(`
      SELECT cau.id, cau.user_id, cau.camera_id, cau.created_at,
             u.name AS user_name, u.code AS user_code, u.department
      FROM camera_allowed_users cau
      JOIN users u ON u.id = cau.user_id
      WHERE cau.camera_id = $1
      ORDER BY u.name
    `, [cameraId]);
  },

  addAllowedUser: async (db, cameraId, userId) => {
    const result = await db.query(`
      INSERT INTO camera_allowed_users (camera_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (camera_id, user_id) DO NOTHING
      RETURNING *
    `, [cameraId, userId]);
    return result?.[0] || { camera_id: cameraId, user_id: userId };
  },

  removeAllowedUser: async (db, cameraId, userId) => {
    await db.query(
      `DELETE FROM camera_allowed_users WHERE camera_id = $1 AND user_id = $2`,
      [cameraId, userId]
    );
    return { success: true };
  },

  // Violations log
  getViolations: async (db, filters = {}) => {
    const where = [`1=1`];
    const values = [];
    let i = 1;
    if (filters.camera_id) { where.push(`sav.camera_id = $${i++}`); values.push(filters.camera_id); }
    if (filters.from)      { where.push(`sav.detected_at >= $${i++}`); values.push(filters.from); }
    if (filters.to)        { where.push(`sav.detected_at <= $${i++}`); values.push(filters.to + ' 23:59:59'); }
    const limit = Number(filters.limit || 50);
    const offset = (Number(filters.page || 1) - 1) * limit;

    const rows = await db.query(`
      SELECT
        sav.id, sav.camera_id, sav.user_id, sav.unknown_face_id,
        sav.camera_session_id, sav.detected_at, sav.image_path,
        c.name AS camera_name, c.location AS camera_location,
        u.name AS user_name, u.code AS user_code
      FROM secured_area_violations sav
      LEFT JOIN cameras c ON c.id = sav.camera_id
      LEFT JOIN users u ON u.id = sav.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY sav.detected_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `, [...values, limit, offset]);

    const countRows = await db.query(
      `SELECT COUNT(*) AS total FROM secured_area_violations sav WHERE ${where.join(' AND ')}`,
      values
    );

    return {
      rows: rows || [],
      total: Number(countRows?.[0]?.total || 0),
    };
  },
};
