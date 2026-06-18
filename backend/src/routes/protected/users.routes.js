import { UserController } from "../../controllers/user.controller.js";
import { AuthenticationController } from "../../controllers/authentication.controller.js";

const ADMIN_ROLES = new Set(['Admin', 'admin', 'super_admin']);
const isAdmin = (role) => ADMIN_ROLES.has(role);
const denyStaff = (req, reply) => reply.code(403).send({ message: "Access denied. Admin only." });

export default async function usersRoutes(fastify, opts) {
  // ── Own profile (any authenticated user) ─────────────────────────────────
  fastify.get("/me", UserController.me);
  fastify.patch("/me", UserController.updateMe);
  fastify.post("/me/avatar", UserController.uploadAvatar);
  fastify.post("/auth/change-password", AuthenticationController.changePassword);

  // ── Face recognition (used for check-in, open to all) ────────────────────
  fastify.post("/users/recognize-face", UserController.recognizeFace);
  fastify.post("/users/capture-frame", UserController.captureFrame);
  fastify.post("/users/check-face", UserController.checkFace);

  // ── Admin-only: employee management ──────────────────────────────────────
  fastify.post("/users/data", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.data(req, reply);
  });

  fastify.get("/users/export", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.exportCsv(req, reply);
  });

  fastify.get("/users/import-template", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.importTemplate(req, reply);
  });

  fastify.get("/users/face-registration/status", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.faceRegistrationStatus(req, reply);
  });

  fastify.post("/users/import", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.importCsv(req, reply);
  });

  fastify.post("/users/:id/register-face-old", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.registerFaceOld(req, reply);
  });

  fastify.post("/users/:id/register-face", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.registerFace(req, reply);
  });

  fastify.delete("/users/:id/poses/:pose", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.deletePose(req, reply);
  });

  fastify.post("/users", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.create(req, reply);
  });

  fastify.put("/users/:id", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.update(req, reply);
  });

  // Staff can only fetch their own profile by ID
  fastify.get("/users/:id", async (req, reply) => {
    if (!isAdmin(req.user.role) && String(req.params.id) !== String(req.user.id)) {
      return denyStaff(req, reply);
    }
    return UserController.get(req, reply);
  });

  fastify.delete("/users/:id", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.deleteOne(req, reply);
  });

  fastify.post("/users/:id/restore", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return UserController.restoreOne(req, reply);
  });
}
