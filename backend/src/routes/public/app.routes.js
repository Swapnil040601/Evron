import { AppController } from "../../controllers/app.controller.js";

export default async function appRoutes(fastify, opts) {
  // Public Routes
  fastify.get("/app", AppController.app);
}