import { EmailController } from "../../controllers/email.controller.js";

export default async function emailRoutes(fastify, opts) {
  fastify.post("/email/test-smtp",         EmailController.testSmtp);
  fastify.post("/email/send-person-report", EmailController.sendPersonReport);
  fastify.get("/email/logs",               EmailController.getLogs);
}
