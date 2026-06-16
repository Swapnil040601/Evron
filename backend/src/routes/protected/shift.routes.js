import { ShiftService } from "../../services/shift.service.js";
import { AuditService } from "../../services/audit.service.js";

const requireSuperAdmin = (req, reply) => {
  if (req.user?.role !== "super_admin") {
    reply.code(403).send({ message: "Forbidden: Super Admin access required." });
    return false;
  }
  return true;
};

export default async function shiftRoutes(fastify, opts) {
  // All authenticated users can view shifts
  fastify.get("/shifts", async (req) => ShiftService.getAll(req.db));

  fastify.get("/shifts/users-with-shifts", async (req) => ShiftService.getUsersWithShifts(req.db));

  fastify.get("/shifts/user/:user_id", async (req) => ShiftService.getUserShifts(req.db, req.params.user_id));

  fastify.post("/shifts/assignments", async (req) => ShiftService.getAssignments(req.db, req.body || {}));

  // Super Admin only — write operations
  fastify.post("/shifts", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;
    const result = await ShiftService.create(req.db, req.body || {});
    AuditService.log(req.db, { actor_id: req.user?.id, action: "shift.create", entity_type: "shift", entity_id: result?.id, entity_name: result?.name, ip: req.ip });
    return result;
  });

  fastify.put("/shifts/:id", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;
    const result = await ShiftService.update(req.db, req.params.id, req.body || {});
    if (!result) return reply.code(404).send({ message: "Shift not found" });
    AuditService.log(req.db, { actor_id: req.user?.id, action: "shift.update", entity_type: "shift", entity_id: result.id, entity_name: result.name, ip: req.ip });
    return result;
  });

  fastify.delete("/shifts/:id", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;
    const shifts = await req.db.query(`SELECT name FROM shifts WHERE id = $1 LIMIT 1`, [req.params.id]);
    const result = await ShiftService.deleteOne(req.db, req.params.id);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "shift.delete", entity_type: "shift", entity_id: req.params.id, entity_name: shifts?.[0]?.name, ip: req.ip });
    return result;
  });

  fastify.post("/shifts/assign", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;
    const { user_id, shift_id, from_date, to_date } = req.body || {};
    if (!user_id || !shift_id || !from_date) return reply.code(400).send({ message: "user_id, shift_id, from_date required" });
    const result = await ShiftService.assignToUser(req.db, user_id, shift_id, from_date, to_date || null);
    const [uRows, sRows] = await Promise.all([
      req.db.query(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [user_id]),
      req.db.query(`SELECT name FROM shifts WHERE id = $1 LIMIT 1`, [shift_id]),
    ]);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "shift.assign", entity_type: "shift", entity_id: String(shift_id), entity_name: `${uRows?.[0]?.name || ""} → ${sRows?.[0]?.name || ""}`, ip: req.ip });
    return result;
  });

  fastify.delete("/shifts/assignment/:id", async (req, reply) => {
    if (!requireSuperAdmin(req, reply)) return;
    const rows = await req.db.query(`
      SELECT u.name AS user_name, s.name AS shift_name
      FROM user_shifts us
      JOIN users u ON u.id = us.user_id
      JOIN shifts s ON s.id = us.shift_id
      WHERE us.id = $1 LIMIT 1
    `, [req.params.id]);
    const result = await ShiftService.removeAssignment(req.db, req.params.id);
    const r = rows?.[0];
    AuditService.log(req.db, { actor_id: req.user?.id, action: "shift.unassign", entity_type: "shift", entity_name: r ? `${r.user_name} from ${r.shift_name}` : null, ip: req.ip });
    return result;
  });
}
