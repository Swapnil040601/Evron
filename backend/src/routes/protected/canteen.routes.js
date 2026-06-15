import { CanteenService } from "../../services/canteen.service.js";

export default async function canteenRoutes(fastify, opts) {
  fastify.post("/canteen/tokens", async (req, reply) => {
    return await CanteenService.getTokens(req.db, req.body || {});
  });

  fastify.post("/canteen/daily-summary", async (req, reply) => {
    return await CanteenService.getDailySummary(req.db, req.body || {});
  });

  fastify.post("/canteen/monthly-report", async (req, reply) => {
    return await CanteenService.getMonthlyReport(req.db, req.body || {});
  });

  fastify.post("/canteen/person-report", async (req, reply) => {
    const { user_id, from, to } = req.body || {};
    if (!user_id || !from || !to) {
      return reply.code(400).send({ message: "user_id, from, to are required" });
    }
    const result = await CanteenService.getPersonReport(req.db, user_id, from, to);
    if (!result) return reply.code(404).send({ message: "User not found" });
    return result;
  });

  // ── Canteen Settings ──────────────────────────────────────────────────────
  fastify.get("/canteen/settings", async (req) => CanteenService.getSettings(req.db));

  fastify.post("/canteen/settings", async (req) => CanteenService.createSetting(req.db, req.body || {}));

  fastify.put("/canteen/settings/:id", async (req, reply) => {
    const result = await CanteenService.updateSetting(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Setting not found" });
    return result;
  });

  fastify.delete("/canteen/settings/:id", async (req) => CanteenService.deleteSetting(req.db, req.params.id));

  // ── Meal Report ───────────────────────────────────────────────────────────
  fastify.get("/canteen/meal-report", async (req, reply) => {
    const { from, to } = req.query;
    if (!from || !to) return reply.code(400).send({ message: "from and to are required" });
    return CanteenService.getMealReport(req.db, { from, to });
  });
}
