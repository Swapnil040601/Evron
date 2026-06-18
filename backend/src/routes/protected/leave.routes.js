import { LeaveService } from "../../services/leave.service.js";
import { AuditService } from "../../services/audit.service.js";

const ADMIN_ROLES = new Set(['Admin', 'admin', 'super_admin']);
const isAdmin = (role) => ADMIN_ROLES.has(role);
const denyStaff = (req, reply) => reply.code(403).send({ message: "Access denied. Admin only." });

export default async function leaveRoutes(fastify, opts) {
  // ── Leave Types ──────────────────────────────────────────────────────────
  fastify.get("/leave/types", async (req) => LeaveService.getLeaveTypes(req.db));

  fastify.post("/leave/types", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return LeaveService.createLeaveType(req.db, req.body || {});
  });

  fastify.put("/leave/types/:id", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    const result = await LeaveService.updateLeaveType(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Leave type not found" });
    return result;
  });

  fastify.delete("/leave/types/:id", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return LeaveService.deleteLeaveType(req.db, req.params.id);
  });

  // ── Leave Balances ────────────────────────────────────────────────────────
  fastify.get("/leave/balances", async (req, reply) => {
    const { year = new Date().getFullYear() } = req.query;
    const userId = isAdmin(req.user.role) ? (req.query.user_id || null) : req.user.id;
    return LeaveService.getLeaveBalances(req.db, { user_id: userId, year: Number(year) });
  });

  fastify.post("/leave/balances", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    const { user_id, leave_type_id, year, allocated } = req.body || {};
    return LeaveService.upsertLeaveBalance(req.db, { user_id, leave_type_id, year, allocated });
  });

  // ── Leave Applications ────────────────────────────────────────────────────
  // Admin sees all; staff are silently scoped to their own
  fastify.get("/leave/applications", async (req, reply) => {
    try {
      const { from, to, status, page, limit } = req.query;
      const user_id = isAdmin(req.user.role) ? (req.query.user_id || undefined) : req.user.id;
      return await LeaveService.getLeaveApplications(req.db, { user_id, from, to, status, page, limit });
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  // Staff can only apply leave for themselves
  fastify.post("/leave/applications", async (req, reply) => {
    try {
      const body = req.body || {};
      if (!isAdmin(req.user.role)) {
        body.user_id = req.user.id;
      }
      const isUserSubmission = body.user_submission === true || !isAdmin(req.user.role);
      return await LeaveService.createLeaveApplication(req.db, body, req.user.id, isUserSubmission);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  });

  // My own leaves
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

  // Approve / reject a leave (admin only)
  fastify.put("/leave/applications/:id/approve", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    const { status } = req.body || {};
    const result = await LeaveService.approveLeaveApplication(req.db, req.params.id, status, req.user.id);
    if (!result) return reply.code(404).send({ message: "Leave application not found" });
    const action = status === "Approved" ? "leave.approve" : "leave.reject";
    AuditService.log(req.db, { actor_id: req.user?.id, action, entity_type: "leave", entity_id: req.params.id, entity_name: result?.user_name || null, ip: req.ip });
    return result;
  });

  fastify.put("/leave/applications/:id", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    const result = await LeaveService.updateLeaveApplication(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Leave application not found" });
    return result;
  });

  fastify.delete("/leave/applications/:id", async (req, reply) => {
    if (!isAdmin(req.user.role)) return denyStaff(req, reply);
    return LeaveService.deleteLeaveApplication(req.db, req.params.id);
  });

  // ── Person report helper ──────────────────────────────────────────────────
  fastify.get("/leave/report", async (req, reply) => {
    const { from, to } = req.query;
    const user_id = isAdmin(req.user.role) ? req.query.user_id : req.user.id;
    if (!user_id || !from || !to) return reply.code(400).send({ message: "user_id, from, to required" });
    return LeaveService.getLeaveReport(req.db, { user_id, from, to });
  });
}
