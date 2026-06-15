import { AlertsService } from "../../services/alerts.service.js";

export default async function alertsRoutes(fastify, opts) {
  fastify.get("/alerts",               async (req)   => AlertsService.getRecent(req.db, req.query));
  fastify.get("/alerts/unread-count",  async (req)   => AlertsService.unreadCount(req.db));
  fastify.post("/alerts/:id/read",     async (req)   => AlertsService.markRead(req.db, req.params.id));
  fastify.post("/alerts/read-all",     async (req)   => AlertsService.markAllRead(req.db));
}
