import { AttendanceController } from "../../controllers/attendance.controller.js";

export default async function attendanceRoutes(fastify, opts) {
  fastify.post("/attendance/data", AttendanceController.data);
  fastify.post("/attendance/monthly", AttendanceController.monthly);
  fastify.post("/attendance/export", AttendanceController.export);
  fastify.get("/attendance/:id", AttendanceController.get);
  fastify.post("/attendance/update/:id", AttendanceController.update);
  fastify.get("/attendance/:id/tracks", AttendanceController.tracks);
}