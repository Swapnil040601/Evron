const SELECT_OPTIONS = {
  ai_run_mode: [
    { value: "cpu", label: "CPU" },
    { value: "balanced", label: "Balanced" },
    { value: "quality", label: "Quality" },
  ],
  ai_yolo_model: [
    { value: "yolov8n.pt", label: "YOLOv8n (fastest)" },
    { value: "yolov8s.pt", label: "YOLOv8s (balanced)" },
    { value: "yolov8m.pt", label: "YOLOv8m (accurate)" },
    { value: "yolov8l.pt", label: "YOLOv8l (high accuracy)" },
  ],
};

function normalizeRow(row) {
  return {
    ...row,
    options: row.options || SELECT_OPTIONS[row.key] || null,
    value: row.type === 'boolean' ? row.value === 'true' : row.value,
  };
}

export const SettingsService = {

  getAll: async (db) => {
    const rows = await db.query(`SELECT * FROM settings ORDER BY group_name, id`);
    const normalizedRows = (rows || []).map(normalizeRow);
    // Group by group_name for frontend convenience
    const grouped = {};
    for (const row of normalizedRows) {
      if (!grouped[row.group_name]) grouped[row.group_name] = [];
      grouped[row.group_name].push(row);
    }
    return { rows: normalizedRows, grouped };
  },

  updateMany: async (db, updates) => {
    // updates: { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2`,
        [String(value), key]
      );
    }
    return { success: true };
  },

  get: async (db, key) => {
    const rows = await db.query(`SELECT value, type FROM settings WHERE key = $1 LIMIT 1`, [key]);
    const row = rows?.[0];
    if (!row) return null;
    return row.type === 'boolean' ? row.value === 'true' : row.value;
  },

  // Convenience: returns all feature flags as { enable_attendance: true, ... }
  getFeatureFlags: async (db) => {
    const rows = await db.query(
      `SELECT key, value FROM settings WHERE group_name = 'Features'`
    );
    const flags = {};
    for (const r of rows || []) flags[r.key] = r.value === 'true';
    return flags;
  },
};
