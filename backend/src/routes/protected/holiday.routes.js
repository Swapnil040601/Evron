import { HolidayService } from "../../services/holiday.service.js";
import { AuditService } from "../../services/audit.service.js";

export default async function holidayRoutes(fastify, opts) {
  fastify.get("/holidays", async (req) => HolidayService.getAll(req.db, req.query));

  fastify.post("/holidays", async (req) => {
    const result = await HolidayService.create(req.db, req.body || {});
    AuditService.log(req.db, { actor_id: req.user?.id, action: "holiday.create", entity_type: "holiday", entity_id: result?.id, entity_name: result?.name || req.body?.name, ip: req.ip });
    return result;
  });

  fastify.put("/holidays/:id", async (req, reply) => {
    const result = await HolidayService.update(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Holiday not found" });
    AuditService.log(req.db, { actor_id: req.user?.id, action: "holiday.update", entity_type: "holiday", entity_id: req.params.id, entity_name: result?.name, ip: req.ip });
    return result;
  });

  fastify.delete("/holidays/:id", async (req) => {
    const rows = await req.db.query(`SELECT name FROM holidays WHERE id = $1 LIMIT 1`, [req.params.id]);
    const result = await HolidayService.deleteOne(req.db, req.params.id);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "holiday.delete", entity_type: "holiday", entity_id: req.params.id, entity_name: rows?.[0]?.name, ip: req.ip });
    return result;
  });

  fastify.post("/holidays/import", async (req, reply) => {
    const { holidays } = req.body || {};
    if (!Array.isArray(holidays) || holidays.length === 0)
      return reply.code(400).send({ message: "holidays array required" });
    const result = await HolidayService.importMany(req.db, holidays);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "holiday.import", entity_type: "holiday", entity_name: `${holidays.length} holidays`, ip: req.ip });
    return result;
  });
}
