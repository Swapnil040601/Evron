import { CameraTrackController } from "../../controllers/camera_track.controller.js";

export default async function cameraTracksRoutes(fastify, opts) {
  fastify.post("/tracks/data", CameraTrackController.data);
  fastify.get("/tracks/:id", CameraTrackController.get);
  fastify.post("/tracks/:id/assign-user", CameraTrackController.assignUser);
  fastify.post("/tracks/export", CameraTrackController.export);
  fastify.post("/tracks/daily-visitors", CameraTrackController.dailyVisitors);
}
