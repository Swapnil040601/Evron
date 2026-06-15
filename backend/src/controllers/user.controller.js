import { UserService } from "../services/user.service.js";
import { AuditService } from "../services/audit.service.js";

export const UserController = {

  data: async (req, reply) => {
    return await UserService.getData(req.db, req.body || {}, req.user || null);
  },

  create: async (req, reply) => {
    const item = await UserService.createOne(req.db, req.body || {}, req.user || null);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "user.create", entity_type: "user", entity_id: item?.id, entity_name: item?.name, ip: req.ip });
    return item;
  },

  update: async (req, reply) => {
    const item = await UserService.updateOne(
      req.db,
      req.params.id,
      req.body || {},
      req.user || null
    );

    if (!item) {
      return reply.code(404).send({ message: "User not found" });
    }

    const payload = req.body || {};
    let action = "user.update";
    if (payload.status === "Inactive") action = "user.deactivate";
    else if (payload.status === "Active") action = "user.activate";
    AuditService.log(req.db, { actor_id: req.user?.id, action, entity_type: "user", entity_id: item.id, entity_name: item.name, ip: req.ip });

    return item;
  },

  get: async (req, reply) => {
    const item = await UserService.getOne(req.db, req.params.id);

    if (!item) {
      return reply.code(404).send({ message: "User not found" });
    }

    return item;
  },
  captureFrame: async (req, reply) => {
    const result = await UserService.captureFrame(
      req.body || {}
    );

    if (!result) {
      return reply.code(404).send({ message: "User not found" });
    }

    return result;
  },

  registerFace: async (req, reply) => {
    const result = await UserService.registerFace(
      req.db,
      req.params.id,
      req.body || {},
      req.user || null
    );

    if (!result) {
      return reply.code(404).send({ message: "User not found" });
    }

    const pose = req.body?.pose || "unknown";
    AuditService.log(req.db, { actor_id: req.user?.id, action: "user.face_register", entity_type: "user", entity_id: req.params.id, entity_name: result?.name, changes: { pose }, ip: req.ip });
    return result;
  },

  faceRegistrationStatus: async (req, reply) => {
    return await UserService.faceRegistrationStatus();
  },

  me: async (req, reply) => {
    try {
      const userId = req.user.id;
      return await UserService.me(req.db, userId);
    } catch (err) {
      return reply.code(401).send({ message: err.message });
    }
  },

  updateMe: async (req, reply) => {
    try {
      return await UserService.updateMe(req.db, req.user.id, req.body || {});
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  uploadAvatar: async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ message: "No file uploaded" });
      return await UserService.uploadAvatar(req.db, req.user.id, data);
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  uploadUserAvatar: async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ message: "No file uploaded" });
      return await UserService.uploadAvatar(req.db, parseInt(req.params.id), data);
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },
  registerFaceOld: async (req, reply) => {
    try {
      return await UserService.registerFace(req.db, req.params.id, req.body);
    } catch (err) {
      return reply.code(401).send({ message: err.message });
    }
  },

  recognizeFace: async (req, reply) => {
    try {
      return await UserService.recognizeFace(req.db, req.body);
    } catch (err) {
      return reply.code(401).send({ message: err.message });
    }
  },

  exportCsv: async (req, reply) => {
    const csv = await UserService.exportCsv(req.db, req.query || {});
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", 'attachment; filename="users-export.csv"');
    return csv;
  },

  importTemplate: async (req, reply) => {
    const csv = "name,code,email,phone,gender,department,type,role,status,password\nJohn Smith,EMP001,john@company.com,9876543210,male,Engineering,Staff,staff,Active,\n";
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", 'attachment; filename="users-import-template.csv"');
    return csv;
  },

  importCsv: async (req, reply) => {
    try {
      const body = req.body || {};
      const csvText = typeof body === "string" ? body : (body.csv || "");
      if (!csvText) return reply.code(400).send({ message: "No CSV data provided" });
      const result = await UserService.importCsv(req.db, csvText, req.user || null);
      const count = result?.imported || result?.count || "";
      AuditService.log(req.db, { actor_id: req.user?.id, action: "user.import", entity_type: "user", entity_name: count ? `${count} employees` : null, ip: req.ip });
      return result;
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  deletePose: async (req, reply) => {
    try {
      const result = await UserService.deletePose(req.db, req.params.id, req.params.pose);
      AuditService.log(req.db, { actor_id: req.user?.id, action: "user.face_delete", entity_type: "user", entity_id: req.params.id, changes: { pose: req.params.pose }, ip: req.ip });
      return result;
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  deleteOne: async (req, reply) => {
    try {
      const user = await UserService.getOne(req.db, req.params.id);
      const result = await UserService.deleteOne(req.db, req.params.id);
      AuditService.log(req.db, { actor_id: req.user?.id, action: "user.delete", entity_type: "user", entity_id: req.params.id, entity_name: user?.name, ip: req.ip });
      return result;
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  restoreOne: async (req, reply) => {
    try {
      const result = await UserService.restoreOne(req.db, req.params.id);
      const user = await UserService.getOne(req.db, req.params.id);
      AuditService.log(req.db, { actor_id: req.user?.id, action: "user.restore", entity_type: "user", entity_id: req.params.id, entity_name: user?.name, ip: req.ip });
      return result;
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  checkFace: async (req, reply) => {
    try {
      return await UserService.checkFace(req.body || {});
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },
};
