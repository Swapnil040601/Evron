import { LeaveService } from "../../services/leave.service.js";
import { AuditService } from "../../services/audit.service.js";

export default async function leaveRoutes(fastify, opts) {
  // ── Leave Types ──────────────────────────────────────────────────────────
  fastify.get("/leave/types", async (req) => LeaveService.getLeaveTypes(req.db));

  fastify.post("/leave/types", async (req) => LeaveService.createLeaveType(req.db, req.body || {}));

  fastify.put("/leave/types/:id", async (req, reply) => {
    const result = await LeaveService.updateLeaveType(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Leave type not found" });
    return result;
  });

  fastify.delete("/leave/types/:id", async (req) => LeaveService.deleteLeaveType(req.db, req.params.id));

  // ── Leave Balances ────────────────────────────────────────────────────────
  fastify.get("/leave/balances", async (req) => {
    const { user_id, year = new Date().getFullYear() } = req.query;
    return LeaveService.getLeaveBalances(req.db, { user_id: user_id || null, year: Number(year) });
  });

  fastify.post("/leave/balances", async (req) => {
    const { user_id, leave_type_id, year, allocated } = req.body || {};
    return LeaveService.upsertLeaveBalance(req.db, { user_id, leave_type_id, year, allocated });
  });

  // ── Leave Applications ────────────────────────────────────────────────────
  fastify.get("/leave/applications", async (req, reply) => {
    try {
      const { user_id, from, to, status, page, limit } = req.query;
      return await LeaveService.getLeaveApplications(req.db, { user_id, from, to, status, page, limit });
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  fastify.post("/leave/applications", async (req, reply) => {
    try {
      const isUserSubmission = req.body?.user_submission === true;
      return await LeaveService.createLeaveApplication(req.db, req.body || {}, req.user?.id, isUserSubmission);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  // My own leaves (for regular users)
  fastify.get("/leave/my", async (req, reply) => {
    try {
      const { from, to, page, limit } = req.query;
      return await LeaveService.getLeaveApplications(req.db, { user_id: req.user.id, from, to, page, limit });
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  fastify.post("/leave/my", async (req, reply) => {
    try {
      return await LeaveService.createLeaveApplication(
        req.db, { ...req.body, user_id: req.user.id }, req.user.id, true
      );
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  // Reportees' leaves (for reporting managers)
  fastify.get("/leave/reportees", async (req) => {
    const { status } = req.query;
    return LeaveService.getReporteesLeaves(req.db, req.user.id, status || null);
  });

  // Approve / reject a leave (reporting manager or admin)
  fastify.put("/leave/applications/:id/approve", async (req, reply) => {
    const { status } = req.body || {};
    const result = await LeaveService.approveLeaveApplication(req.db, req.params.id, status, req.user.id);
    if (!result) return reply.code(404).send({ message: "Leave application not found" });
    const action = status === "Approved" ? "leave.approve" : "leave.reject";
    AuditService.log(req.db, { actor_id: req.user?.id, action, entity_type: "leave", entity_id: req.params.id, entity_name: result?.user_name || null, ip: req.ip });
    return result;
  });

  fastify.put("/leave/applications/:id", async (req, reply) => {
    const result = await LeaveService.updateLeaveApplication(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Leave application not found" });
    return result;
  });

  fastify.delete("/leave/applications/:id", async (req) => {
    return LeaveService.deleteLeaveApplication(req.db, req.params.id);
  });

  // ── Person report helper ──────────────────────────────────────────────────
  fastify.get("/leave/report", async (req, reply) => {
    const { user_id, from, to } = req.query;
    if (!user_id || !from || !to) return reply.code(400).send({ message: "user_id, from, to required" });
    return LeaveService.getLeaveReport(req.db, { user_id, from, to });
  });
}
