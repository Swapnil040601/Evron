import { AttendanceService } from "../services/attendance.service.js";
import { AuditService } from "../services/audit.service.js";

export const AttendanceController = {
  data: async (req, reply) => {
    return await AttendanceService.getData(req.db, req.body || {});
  },

  get: async (req, reply) => {
    const item = await AttendanceService.getOne(req.db, req.params.id);

    if (!item) {
      return reply.code(404).send({ message: "Attendance not found" });
    }

    return item;
  },

  update: async (req, reply) => {
    const item = await AttendanceService.updateOne(
      req.db,
      req.params.id,
      req.body || {},
      req.user || null
    );

    if (!item) {
      return reply.code(404).send({ message: "Attendance not found" });
    }

    const label = `${item.user_name || ""}${item.date ? " on " + String(item.date).slice(0, 10) : ""}`.trim();
    AuditService.log(req.db, { actor_id: req.user?.id, action: "attendance.edit", entity_type: "attendance", entity_id: req.params.id, entity_name: label, changes: req.body, ip: req.ip });

    return {
      message: "Attendance updated successfully",
      data: item,
    };
  },

  export: async (req, reply) => {
    const result = await AttendanceService.exportData(req.db, req.body || {});

    reply
      .header("Content-Type", "text/csv")
      .header(
        "Content-Disposition",
        `attachment; filename="attendance-${req.body?.from || "report"}.csv"`
      );

    return reply.send(result);
  },
  monthly: async (req, reply) => {
    return await AttendanceService.getMonthly(req.db, req.body || {});
  },

  tracks: async (req, reply) => {
    const result = await AttendanceService.getTracksByAttendance(req.db, req.params.id);

    if (!result) {
      return reply.code(404).send({ message: "Attendance not found" });
    }

    return result;
  },
};