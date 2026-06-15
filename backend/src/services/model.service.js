import bcrypt from "bcryptjs";
import { modelRegistry } from "../models/index.js";

function normalizeAllowedUserIds(value) {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.map((id) => Number(id)).filter(Boolean))];
}

const CAMERA_BULK_FEATURE_FIELDS = [
  "ai_detection",
  "enable_attendance",
  "enable_phone_detection",
  "enable_fire_detection",
  "enable_vehicle_access",
  "is_secured",
];

async function syncCameraAllowedUsers(db, cameraId, isSecured, allowedUserIds) {
  if (!cameraId || allowedUserIds === null) return;

  if (!isSecured) {
    await db.query(`DELETE FROM camera_allowed_users WHERE camera_id = $1`, [cameraId]);
    return;
  }

  await db.query(`DELETE FROM camera_allowed_users WHERE camera_id = $1`, [cameraId]);
  for (const userId of allowedUserIds) {
    await db.query(
      `
      INSERT INTO camera_allowed_users (camera_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (camera_id, user_id) DO NOTHING
      `,
      [cameraId, userId]
    );
  }
}

export const ModelService = {
  // GET ALL
  getAll: async (db, name) => {
    const repo = db.getRepository(name);
    const models = await repo.find({
      order: { id: "DESC" }
    });

    return { data: models };
  },

  // GET ONE
  getOne: async (db, name, id) => {
    const repo = db.getRepository(name);
    const record = await repo.findOne({
      where: { id }
    });

    if (!record) throw new Error(`${name} with id ${id} not found`);

    if (name === "Camera") {
      const allowedRows = await db.query(
        `SELECT user_id FROM camera_allowed_users WHERE camera_id = $1 ORDER BY user_id`,
        [id]
      );
      record.allowed_user_ids = (allowedRows || []).map((row) => row.user_id);
    }

    // Resolve model config dynamically
    const model = modelRegistry[name];

    let viewActions;
    if (model?.viewActions) {
      viewActions = model.viewActions(record);
    }
    return { data: record, actions: viewActions ?? [] };
  },

  // CREATE
  create: async (db, name, data) => {
    const repo = db.getRepository(name);
    const allowedUserIds = name === "Camera"
      ? normalizeAllowedUserIds(data.allowed_user_ids)
      : null;
    delete data.allowed_user_ids;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }
    // Remove null or undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v != null) // removes null and undefined
    );
    const saved = await repo.save(cleanData);

    if (name === "Camera") {
      await syncCameraAllowedUsers(db, saved.id, cleanData.is_secured, allowedUserIds);
    }

    return saved.id;
  },

  // UPDATE (Fix applied here)
  update: async (db, name, id, data) => {
    const repo = db.getRepository(name);
    const allowedUserIds = name === "Camera"
      ? normalizeAllowedUserIds(data.allowed_user_ids)
      : null;
    delete data.allowed_user_ids;

    // Remove null or undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v != null) // removes null and undefined
    );

    // 3. Update using ONLY 'rest' (contains model_name, image_url, etc.)
    // We DO NOT pass the raw 'image' base64 string to the database
    const result = await repo.update({ id }, cleanData);

    if (result.affected === 0) throw new Error(`${name} with id ${id} not found`);

    if (name === "Camera") {
      const isSecured = cleanData.is_secured !== undefined
        ? cleanData.is_secured
        : (await repo.findOne({ where: { id } }))?.is_secured;
      await syncCameraAllowedUsers(db, id, isSecured, allowedUserIds);
    }

    return true;
  },

  delete: async (db, name, id) => {
    const repo = db.getRepository(name);
    const result = await repo.delete({ id });
    if (result.affected === 0) throw new Error(`${name} with id ${id} not found`);
    return result;
  },

  bulkUpdateCameras: async (db, data = {}) => {
    const updates = {};

    for (const field of CAMERA_BULK_FEATURE_FIELDS) {
      if (typeof data[field] === "boolean") updates[field] = data[field];
    }

    if (Object.keys(updates).length === 0) {
      const err = new Error("No camera feature fields provided");
      err.statusCode = 422;
      throw err;
    }

    const ids = Array.isArray(data.ids)
      ? [...new Set(data.ids.map((id) => Number(id)).filter(Boolean))]
      : [];

    const repo = db.getRepository("Camera");
    const result = ids.length
      ? await repo.createQueryBuilder()
        .update()
        .set(updates)
        .where("id IN (:...ids)", { ids })
        .execute()
      : await repo.createQueryBuilder()
        .update()
        .set(updates)
        .execute();

    if (updates.is_secured === false) {
      if (ids.length) {
        await db.query(`DELETE FROM camera_allowed_users WHERE camera_id = ANY($1::int[])`, [ids]);
      } else {
        await db.query(`DELETE FROM camera_allowed_users`);
      }
    }

    return {
      affected: result.affected || 0,
      updates,
    };
  },
};
