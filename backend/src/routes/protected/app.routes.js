import { AppController } from "../../controllers/app.controller.js";

export default async function appRoutes(fastify, opts) {
  fastify.get("/configs", AppController.configs);
  fastify.get("/options", AppController.options);
  fastify.post("/dashboard/data", AppController.dashboardData);
  fastify.post("/dashboard/export", AppController.dashboardExport);
  fastify.post("/employee/report/:user_id", AppController.employeeReport);
  fastify.post("/employee/export", AppController.employeeExport);
}