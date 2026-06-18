import { LocationController } from "../../controllers/location.controller.js";

const ADMIN_ROLES = new Set(['Admin', 'admin', 'super_admin']);
const isAdmin = (role) => ADMIN_ROLES.has(role);

export default async function locationsRoutes(fastify, opts) {
  // Every employee posts their own location (30-second heartbeat)
  fastify.post("/me/location", LocationController.upsertMyLocation);

  // Latest position per employee
  // Admin/super_admin → all employees; staff → only own record
  fastify.get("/employee-locations", async (req, reply) => {
    if (isAdmin(req.user.role)) {
      return LocationController.getAllLocations(req, reply);
    }
    // Staff: return only their own location as a single-element array
    return LocationController.getMyLocation(req, reply);
  });

  // Full GPS history (paginated)
  // Admin → any user_id; staff → forced to own user_id
  fastify.get("/location-logs", async (req, reply) => {
    if (!isAdmin(req.user.role)) {
      req.query.user_id = String(req.user.id);
    }
    return LocationController.getLocationLogs(req, reply);
  });

  // CSV export
  // Admin → all / selected user; staff → own data only
  fastify.get("/location-logs/export", async (req, reply) => {
    if (!isAdmin(req.user.role)) {
      req.query.user_id = String(req.user.id);
    }
    return LocationController.exportLocationLogs(req, reply);
  });
}
