import { LocationController } from "../../controllers/location.controller.js";

export default async function locationsRoutes(fastify, opts) {
  // Employee posts their own location (called every 30s from the app)
  fastify.post("/me/location", LocationController.upsertMyLocation);

  // Admin/super_admin reads all employee locations (latest position)
  fastify.get("/employee-locations", LocationController.getAllLocations);

  // Full GPS history log (every 30s ping stored)
  fastify.get("/location-logs", LocationController.getLocationLogs);

  // CSV export of full location history
  fastify.get("/location-logs/export", LocationController.exportLocationLogs);
}
