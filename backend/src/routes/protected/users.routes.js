import { UserController } from "../../controllers/user.controller.js";
import { AuthenticationController } from "../../controllers/authentication.controller.js";

export default async function usersRoutes(fastify, opts) {
  fastify.get("/me", UserController.me);
  fastify.patch("/me", UserController.updateMe);
  fastify.post("/me/avatar", UserController.uploadAvatar);
  fastify.post("/auth/change-password", AuthenticationController.changePassword);
  fastify.post("/users/:id/register-face-old", UserController.registerFaceOld);
  fastify.post("/users/recognize-face", UserController.recognizeFace);

  fastify.post("/users/data", UserController.data);
  fastify.get("/users/export", UserController.exportCsv);
  fastify.get("/users/import-template", UserController.importTemplate);
  fastify.get("/users/face-registration/status", UserController.faceRegistrationStatus);
  fastify.post("/users/import", UserController.importCsv);
  fastify.post("/users", UserController.create);
  fastify.put("/users/:id", UserController.update);
  fastify.get("/users/:id", UserController.get);
  fastify.post("/users/capture-frame", UserController.captureFrame);
  fastify.post("/users/check-face", UserController.checkFace);
  fastify.post("/users/:id/register-face", UserController.registerFace);
  fastify.post("/users/:id/avatar", UserController.uploadUserAvatar);
  fastify.delete("/users/:id/poses/:pose", UserController.deletePose);
  fastify.delete("/users/:id", UserController.deleteOne);
  fastify.post("/users/:id/restore", UserController.restoreOne);
}
