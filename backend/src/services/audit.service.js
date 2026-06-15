// Actions that also generate a platform alert
const ALERT_ACTIONS = {
  "user.delete":     { severity: "warning", label: (a, e) => `${a} deleted employee "${e}"` },
  "user.deactivate": { severity: "info",    label: (a, e) => `${a} deactivated "${e}"` },
  "attendance.edit": { severity: "info",    label: (a, e) => `${a} manually edited attendance for "${e}"` },
  "settings.update": { severity: "info",    label: (a, _) => `${a} updated system settings` },
  "user.import":     { severity: "info",    label: (a, e) => `${a} bulk-imported employees${e ? ` (${e})` : ""}` },
  "shift.delete":    { severity: "info",    label: (a, e) => `${a} deleted shift "${e}"` },
};

export const AuditService = {

  // Fire-and-forget — failures must never break the calling operation
  log: async (db, { actor_id, actor_name, action, entity_type, entity_id, entity_name, changes, ip }) => {
    try {
      // Resolve actor name from DB if not provided (JWT only has id/email/role)
      let name = actor_name || null;
      if (!name && actor_id) {
        const rows = await db.query(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [actor_id]);
        name = rows?.[0]?.name || null;
      }

      await db.query(`
        INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, entity_name, changes, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        actor_id    || null,
        name,
        action,
        entity_type || null,
        entity_id   ? String(entity_id) : null,
        entity_name || null,
        changes     ? JSON.stringify(changes) : null,
        ip          || null,
      ]);

      // Generate alert for significant actions
      const alertDef = ALERT_ACTIONS[action];
      if (alertDef) {
        const msg = alertDef.label(name || "Admin", entity_name || "");
        await db.query(`
          INSERT INTO platform_alerts (type, severity, message, user_id, data)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          "admin_action",
          alertDef.severity,
          msg,
          actor_id || null,
          JSON.stringify({ action, entity_type, entity_id: entity_id ? String(entity_id) : null, entity_name }),
        ]);
      }
    } catch (err) {
      console.error("[audit] log error:", err.message);
    }
  },

  getData: async (db, filters = {}) => {
    const page  = Number(filters.page  || 1);
    const limit = Number(filters.limit || 50);
    const offset = (page - 1) * limit;

    const where  = [];
    const values = [];
    let i = 1;

    if (filters.from)        { where.push(`al.created_at >= $${i++}`);  values.push(filters.from); }
    if (filters.to)          { where.push(`al.created_at <= $${i++}`);  values.push(filters.to + " 23:59:59"); }
    if (filters.actor_id)    { where.push(`al.actor_id = $${i++}`);     values.push(filters.actor_id); }
    if (filters.action)      { where.push(`al.action = $${i++}`);       values.push(filters.action); }
    if (filters.entity_type) { where.push(`al.entity_type = $${i++}`);  values.push(filters.entity_type); }
    if (filters.search) {
      where.push(`(al.actor_name ILIKE $${i} OR al.entity_name ILIKE $${i} OR al.action ILIKE $${i})`);
      values.push(`%${filters.search}%`);
      i++;
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows, countRows] = await Promise.all([
      db.query(`
        SELECT al.id, al.actor_id, al.actor_name, al.action,
               al.entity_type, al.entity_id, al.entity_name,
               al.changes, al.ip_address, al.created_at
        FROM audit_logs al
        ${whereSQL}
        ORDER BY al.created_at DESC
        LIMIT $${i} OFFSET $${i + 1}
      `, [...values, limit, offset]),
      db.query(`SELECT COUNT(*) AS total FROM audit_logs al ${whereSQL}`, values),
    ]);

    const total = Number(countRows?.[0]?.total || 0);
    return {
      rows: rows || [],
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    };
  },
};
