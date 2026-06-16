import { LocationService } from "../services/location.service.js";

export const LocationController = {
  upsertMyLocation: async (req, reply) => {
    try {
      const userId = req.user.id;
      const body = req.body || {};

      if (body.latitude == null || body.longitude == null) {
        return reply.code(400).send({ message: "latitude and longitude are required" });
      }

      const row = await LocationService.upsertLocation(req.db, userId, body);
      return { success: true, location: row };
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to save location" });
    }
  },

  getAllLocations: async (req, reply) => {
    try {
      const rows = await LocationService.getAllLocations(req.db);
      return rows;
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to fetch locations" });
    }
  }
};
