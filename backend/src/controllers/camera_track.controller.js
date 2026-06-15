import { CameraTrackService } from "../services/camera_track.service.js";

export const CameraTrackController = {
  data: async (req, reply) => {
    return await CameraTrackService.getData(req.db, req.body || {});
  },

  get: async (req, reply) => {
    const item = await CameraTrackService.getOne(req.db, req.params.id);

    if (!item) {
      return reply.code(404).send({ message: "Track not found" });
    }

    return item;
  },

  assignUser: async (req, reply) => {
    try {
      return await CameraTrackService.assignUnknownToUser(
        req.db,
        req.params.id,
        req.body || {},
        req.user || null
      );
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  },

  dailyVisitors: async (req, reply) => {
    return await CameraTrackService.getDailyVisitors(req.db, req.body?.date || null);
  },

  export: async (req, reply) => {
    const result = await CameraTrackService.exportData(req.db, req.body || {});

    reply
      .header("Content-Type", "text/csv")
      .header(
        "Content-Disposition",
        `attachment; filename="camera-tracks-${req.body?.date || "export"}.csv"`
      );

    return reply.send(result);
  }
};
