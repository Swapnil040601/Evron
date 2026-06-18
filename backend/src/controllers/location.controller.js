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
  },

  getMyLocation: async (req, reply) => {
    try {
      const rows = await LocationService.getLocationsByUserId(req.db, req.user.id);
      return rows;
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to fetch location" });
    }
  },

  getLocationLogs: async (req, reply) => {
    try {
      const { user_id, from, to, limit } = req.query;
      const rows = await LocationService.getLocationLogs(req.db, { userId: user_id, from, to, limit });
      return rows;
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to fetch location logs" });
    }
  },

  exportLocationLogs: async (req, reply) => {
    try {
      const { from, to, user_id } = req.query;
      const csv = await LocationService.exportLocationLogs(req.db, { from, to, userId: user_id });
      const filename = `location-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(csv);
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to export location logs" });
    }
  }
};
