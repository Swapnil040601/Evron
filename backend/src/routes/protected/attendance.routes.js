import { AttendanceController } from "../../controllers/attendance.controller.js";
import { AuditService } from "../../services/audit.service.js";

export default async function attendanceRoutes(fastify, opts) {
  // Admin / manager routes
  fastify.post("/attendance/data", AttendanceController.data);
  fastify.post("/attendance/monthly", AttendanceController.monthly);
  fastify.post("/attendance/export", AttendanceController.export);
  fastify.get("/attendance/:id", AttendanceController.get);
  fastify.post("/attendance/update/:id", AttendanceController.update);
  fastify.get("/attendance/:id/tracks", AttendanceController.tracks);

  // ── Employee self-service punch routes ──────────────────────────────────

  // Today's attendance record for the logged-in employee
  fastify.get("/attendance/my/today", async (req, reply) => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await req.db.query(
      `SELECT * FROM attendances WHERE user_id = $1 AND date = $2 LIMIT 1`,
      [req.user.id, today]
    );
    return rows?.[0] || null;
  });

  // Attendance history for the logged-in employee
  fastify.get("/attendance/my/history", async (req, reply) => {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = today.slice(0, 7) + "-01";
    const from = req.query.from || firstOfMonth;
    const to   = req.query.to   || today;
    const rows = await req.db.query(
      `SELECT * FROM attendances WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC LIMIT 62`,
      [req.user.id, from, to]
    );
    return rows || [];
  });

  // Punch In
  fastify.post("/attendance/punch-in", async (req, reply) => {
    const { lat, lng, wifi_ssid } = req.body || {};
    const userId = req.user.id;
    const today  = new Date().toISOString().slice(0, 10);
    const now    = new Date();

    const rows = await req.db.query(`
      INSERT INTO attendances (user_id, date, status, mobile_punch_in, punch_in_lat, punch_in_lng, punch_in_wifi, created_by, updated_by)
      VALUES ($1, $2, 'Present', $3, $4, $5, $6, $1, $1)
      ON CONFLICT (user_id, date) DO UPDATE SET
        status           = CASE WHEN attendances.mobile_punch_in IS NOT NULL THEN attendances.status ELSE 'Present' END,
        mobile_punch_in  = COALESCE(attendances.mobile_punch_in, $3),
        punch_in_lat     = COALESCE(attendances.punch_in_lat,  $4),
        punch_in_lng     = COALESCE(attendances.punch_in_lng,  $5),
        punch_in_wifi    = COALESCE(attendances.punch_in_wifi, $6),
        updated_at       = NOW(),
        updated_by       = $1
      RETURNING *
    `, [userId, today, now, lat ?? null, lng ?? null, wifi_ssid ?? null]);

    const record = rows?.[0];
    if (!record?.id) return reply.code(409).send({ message: "Already punched in today." });

    AuditService.log(req.db, {
      actor_id: userId,
      action: "attendance.punch_in",
      entity_type: "attendance",
      entity_id: record.id,
      entity_name: `Punch In at ${now.toISOString().slice(11, 16)} UTC`,
      ip: req.ip,
    });

    return record;
  });

  // Punch Out
  fastify.post("/attendance/punch-out", async (req, reply) => {
    const { lat, lng } = req.body || {};
    const userId = req.user.id;
    const today  = new Date().toISOString().slice(0, 10);
    const now    = new Date();

    const existing = await req.db.query(
      `SELECT * FROM attendances WHERE user_id = $1 AND date = $2 LIMIT 1`,
      [userId, today]
    );

    if (!existing?.[0]) {
      return reply.code(404).send({ message: "No punch-in found for today. Please punch in first." });
    }
    if (existing[0].mobile_punch_out) {
      return reply.code(400).send({ message: "Already punched out today." });
    }

    const rows = await req.db.query(`
      UPDATE attendances SET
        mobile_punch_out = $3,
        punch_out_lat    = $4,
        punch_out_lng    = $5,
        updated_at       = NOW(),
        updated_by       = $1
      WHERE user_id = $1 AND date = $2
      RETURNING *
    `, [userId, today, now, lat ?? null, lng ?? null]);

    const record = rows?.[0];
    AuditService.log(req.db, {
      actor_id: userId,
      action: "attendance.punch_out",
      entity_type: "attendance",
      entity_id: record?.id,
      entity_name: `Punch Out at ${now.toISOString().slice(11, 16)} UTC`,
      ip: req.ip,
    });

    return record;
  });
}
