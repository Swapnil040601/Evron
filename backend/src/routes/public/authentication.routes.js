import { AuthenticationController } from "../../controllers/authentication.controller.js";

export default async function authenticationRoutes(fastify, opts) {
  fastify.post("/login", AuthenticationController.login);
  fastify.post("/register", AuthenticationController.register);
  fastify.post("/forgot-password", AuthenticationController.forgotPassword);
  fastify.post("/reset-password", AuthenticationController.resetPassword);
}