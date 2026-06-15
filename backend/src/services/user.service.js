import fs from "fs";
import path from "path";
import "dotenv/config";

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildWhere(filters = {}) {
  const where = [];
  const values = [];
  let i = 1;

  where.push(`u.deleted_at IS NULL`);
  where.push(`u.status = $${i}`);
  values.push('Active');
  i++;

  if (filters.search) {
    where.push(`
      (
        COALESCE(u.name, '') ILIKE $${i}
        OR COALESCE(u.email, '') ILIKE $${i}
        OR COALESCE(u.code, '') ILIKE $${i}
        OR COALESCE(u.phone, '') ILIKE $${i}
        OR COALESCE(u.department, '') ILIKE $${i}
      )
    `);
    values.push(`%${filters.search}%`);
    i++;
  }

  if (filters.status) {
    where.push(`u.status = $${i}`);
    values.push(filters.status);
    i++;
  }

  if (filters.type) {
    where.push(`u.type = $${i}`);
    values.push(filters.type);
    i++;
  }

  if (filters.role) {
    where.push(`u.role = $${i}`);
    values.push(filters.role);
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

function removeRegisteredFaceImage(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return;
  if (!imagePath.startsWith("registered/")) return;

  const filesRoot = process.env.FOLDER || "/app/files";
  const fullPath = path.resolve(filesRoot, imagePath);
  const registeredRoot = path.resolve(filesRoot, "registered");

  if (!fullPath.startsWith(`${registeredRoot}${path.sep}`)) return;
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

export const UserService = {
  getData: async (db, filters = {}) => {
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 10);
    const offset = (page - 1) * limit;

    const { whereSql, values } = buildWhere(filters);

    const summaryQuery = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE u.status =  'Active' ) AS active_count,
        COUNT(*) FILTER (WHERE u.status = 'Inactive') AS inactive_count,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM user_faces uf
            WHERE uf.user_id = u.id
          )
        ) AS face_registered_count
      FROM users u
      ${whereSql}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereSql}
    `;

    const dataQuery = `
      SELECT
        u.id,
        u.name,
        u.code,
        u.email,
        u.phone,
        u.gender,
        u.type,
        u.department,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT uf.pose)::int AS registered_pose_count,
        COALESCE(
          ARRAY_AGG(uf.pose ORDER BY uf.pose) FILTER (WHERE uf.pose IS NOT NULL),
          ARRAY[]::varchar[]
        ) AS poses,
        COALESCE(
          JSONB_OBJECT_AGG(uf.pose, uf.image_path) FILTER (WHERE uf.pose IS NOT NULL),
          '{}'::jsonb
        ) AS pose_images
      FROM users u
      LEFT JOIN user_faces uf ON uf.user_id = u.id
      ${whereSql}
      GROUP BY
        u.id,
        u.name,
        u.code,
        u.email,
        u.phone,
        u.gender,
        u.type,
        u.department,
        u.role,
        u.status,
        u.created_at,
        u.updated_at
      ORDER BY u.id DESC
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
    const total = Number(countRow.total ?? 0);

    return {
      summary: {
        total: Number(summaryRow.total ?? 0),
        active: Number(summaryRow.active_count ?? 0),
        inactive: Number(summaryRow.inactive_count ?? 0),
        face_registered: Number(summaryRow.face_registered_count ?? 0),
      },
      rows: (rows || []).map((row) => ({
        ...row,
        registered_pose_count: Number(row.registered_pose_count || 0),
        poses: Array.isArray(row.poses) ? row.poses : [],
        pose_images: row.pose_images || {},
        face_registered: Number(row.registered_pose_count || 0) > 0,
        face_status:
          Number(row.registered_pose_count || 0) >= 6
            ? "complete"
            : Number(row.registered_pose_count || 0) > 0
              ? "partial"
              : "pending",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 1,
      },
    };
  },

  createOne: async (db, payload = {}, currentUser = null) => {
    if (payload.code) {
      const existing = await db.query(`SELECT id FROM users WHERE code = $1 LIMIT 1`, [payload.code]);
      if (existing?.[0]) throw new Error(`Employee code "${payload.code}" is already in use`);
    }

    const query = `
      INSERT INTO users (
        name,
        code,
        gender,
        email,
        phone,
        type,
        department,
        role,
        status,
        password,
        created_at,
        created_by,
        updated_at,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, NOW(), $12)
      RETURNING id
    `;

    const values = [
      payload.name || null,
      payload.code || null,
      payload.gender || null,
      payload.email || null,
      payload.phone || null,
      payload.type || "Staff",
      payload.department || null,
      payload.role || "Staff",
      payload.status || "Active",
      payload.password || null,
      currentUser?.id || null,
      currentUser?.id || null,
    ];

    const result = await db.query(query, values);
    const id = result?.[0]?.id;

    if (!id) return null;

    return await UserService.getOne(db, id);
  },

  getOne: async (db, id) => {
    const query = `
      SELECT
        u.id,
        u.name,
        u.code,
        u.gender,
        u.email,
        u.phone,
        u.type,
        u.department,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT uf.pose)::int AS registered_pose_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', uf.id,
              'pose', uf.pose,
              'image_path', uf.image_path,
              'created_at', uf.created_at,
              'updated_at', uf.updated_at
            )
            ORDER BY uf.pose
          ) FILTER (WHERE uf.id IS NOT NULL),
          '[]'::json
        ) AS face_rows
      FROM users u
      LEFT JOIN user_faces uf ON uf.user_id = u.id
      WHERE u.id = $1
      GROUP BY
        u.id,
        u.name,
        u.code,
        u.gender,
        u.email,
        u.phone,
        u.type,
        u.department,
        u.role,
        u.status,
        u.created_at,
        u.updated_at
      LIMIT 1
    `;

    const result = await db.query(query, [id]);
    const row = result?.[0];

    if (!row) return null;

    return {
      ...row,
      registered_pose_count: Number(row.registered_pose_count || 0),
      face_registered: Number(row.registered_pose_count || 0) > 0,
      face_status:
        Number(row.registered_pose_count || 0) >= 6
          ? "complete"
          : Number(row.registered_pose_count || 0) > 0
            ? "partial"
            : "pending",
    };
  },

  updateOne: async (db, id, payload = {}, currentUser = null) => {
    const existing = await db.query(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!existing?.[0]) return null;

    const allowedFields = [
      "name",
      "code",
      "gender",
      "email",
      "phone",
      "type",
      "department",
      "role",
      "status",
      "password",
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

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${i}`);
    values.push(currentUser?.id || null);
    i++;

    values.push(id);

    await db.query(
      `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${i}
      `,
      values
    );

    return await UserService.getOne(db, id);
  },
  me: async (db, userId) => {
    try {
      const rows = await db.query(
        `SELECT u.id, u.name, u.code, u.gender, u.email, u.phone, u.type, u.department,
                u.role, u.status, u.avatar, u.reporting_manager_id,
                m.name AS reporting_manager_name
         FROM users u
         LEFT JOIN users m ON m.id = u.reporting_manager_id
         WHERE u.id = $1`,
        [userId]
      );
      if (!rows.length) throw new Error("Invalid user");
      return { user: rows[0] };
    } catch (err) {
      // reporting_manager_id column may not exist before migration 20 runs — fall back
      if (err.message && err.message.includes("reporting_manager_id")) {
        const userRepo = db.getRepository("User");
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) throw new Error("Invalid user");
        const { password: _, ...safeUser } = user;
        return { user: safeUser };
      }
      throw err;
    }
  },

  updateMe: async (db, userId, data) => {
    const allowed = ["name", "phone", "gender"];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (data[key] !== undefined) {
        sets.push(`${key} = $${i}`);
        values.push(data[key]);
        i++;
      }
    }
    if (sets.length === 0) throw new Error("No valid fields to update");
    values.push(userId);
    await db.query(
      `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${i}`,
      values
    );
    const rows = await db.query(`SELECT id, name, code, gender, email, phone, type, department, role, status, avatar FROM users WHERE id = $1`, [userId]);
    return { user: rows[0] };
  },

  uploadAvatar: async (db, userId, file) => {
    ensureDir(`/app/files/avatars`);
    const ext = (file.mimetype || "image/jpeg").split("/")[1] || "jpg";
    const filePath = `/app/files/avatars/${userId}.${ext}`;
    fs.writeFileSync(filePath, await file.toBuffer());
    const relativePath = `avatars/${userId}.${ext}`;
    await db.query(`UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2`, [relativePath, userId]);
    return { avatar: relativePath };
  },
  exportCsv: async (db, filters = {}) => {
    const where = [`u.deleted_at IS NULL`];
    const values = [];
    let i = 1;

    if (filters.search) {
      where.push(`(COALESCE(u.name,'') ILIKE $${i} OR COALESCE(u.code,'') ILIKE $${i} OR COALESCE(u.email,'') ILIKE $${i} OR COALESCE(u.department,'') ILIKE $${i})`);
      values.push(`%${filters.search}%`);
      i++;
    }
    if (filters.status) { where.push(`u.status = $${i++}`); values.push(filters.status); }
    if (filters.type)   { where.push(`u.type = $${i++}`);   values.push(filters.type); }
    if (filters.role)   { where.push(`u.role = $${i++}`);   values.push(filters.role); }

    const rows = await db.query(`
      SELECT u.name, u.code, u.email, u.phone, u.gender, u.department, u.type, u.role, u.status,
             TO_CHAR(u.created_at, 'YYYY-MM-DD') AS joined_date
      FROM users u
      WHERE ${where.join(" AND ")}
      ORDER BY u.id DESC
    `, values);

    const headers = ["name", "code", "email", "phone", "gender", "department", "type", "role", "status", "joined_date"];
    const escapeCSV = (val) => {
      const s = String(val ?? "");
      return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const row of (rows || [])) {
      lines.push(headers.map(h => escapeCSV(row[h])).join(","));
    }
    return lines.join("\n");
  },

  importCsv: async (db, csvText, currentUser = null) => {
    const parseCSVLine = (line) => {
      const fields = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuote) {
          if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuote = false; }
          else cur += ch;
        } else {
          if (ch === '"') inQuote = true;
          else if (ch === ",") { fields.push(cur); cur = ""; }
          else cur += ch;
        }
      }
      fields.push(cur);
      return fields;
    };

    const normalized = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const lines = normalized.split("\n");
    if (lines.length < 2) return { inserted: 0, skipped: 0, errors: [] };

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    const required = ["name", "code", "email", "phone", "gender", "department"];

    let inserted = 0, skipped = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const vals = parseCSVLine(line);
      const row = {};
      headers.forEach((h, idx) => { row[h] = (vals[idx] || "").trim(); });

      const missing = required.filter(f => !row[f]);
      if (missing.length > 0) {
        errors.push({ row: i + 1, message: `Missing required: ${missing.join(", ")}` });
        skipped++;
        continue;
      }

      try {
        await UserService.createOne(db, {
          name: row.name,
          code: row.code,
          email: row.email,
          phone: row.phone,
          gender: row.gender,
          department: row.department,
          type: row.type || "Staff",
          role: row.role || "staff",
          status: row.status || "Active",
          password: row.password || null,
        }, currentUser);
        inserted++;
      } catch (err) {
        errors.push({ row: i + 1, message: err.message });
        skipped++;
      }
    }

    return { inserted, skipped, errors };
  },

  deleteOne: async (db, id) => {
    const existing = await db.query(
      `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!existing?.[0]) throw new Error("User not found");

    await db.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1`,
      [id]
    );

    return { success: true };
  },

  restoreOne: async (db, id) => {
    const existing = await db.query(
      `SELECT id FROM users WHERE id = $1 AND deleted_at IS NOT NULL LIMIT 1`,
      [id]
    );
    if (!existing?.[0]) throw new Error("User not found or not deleted");

    await db.query(
      `UPDATE users SET deleted_at = NULL WHERE id = $1`,
      [id]
    );

    return { success: true };
  },
};
