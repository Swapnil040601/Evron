import { AuditService } from "../../services/audit.service.js";

export default async function auditRoutes(fastify, opts) {
  fastify.post("/audit-logs", async (req) => {
    return AuditService.getData(req.db, req.body || {});
  });
}
