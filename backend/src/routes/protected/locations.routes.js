import { LocationController } from "../../controllers/location.controller.js";

export default async function locationsRoutes(fastify, opts) {
  // Employee posts their own location (called every 30s from the app)
  fastify.post("/me/location", LocationController.upsertMyLocation);

  // Admin/super_admin reads all employee locations
  fastify.get("/employee-locations", LocationController.getAllLocations);
}
