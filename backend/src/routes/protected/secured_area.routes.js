import { SecuredAreaService } from "../../services/secured_area.service.js";
import { AuditService } from "../../services/audit.service.js";

export default async function securedAreaRoutes(fastify, opts) {
  fastify.get("/secured-area/cameras",                  async (req)        => SecuredAreaService.getSecuredCameras(req.db));
  fastify.get("/secured-area/cameras/:id/users",        async (req)        => SecuredAreaService.getAllowedUsers(req.db, req.params.id));
  fastify.post("/secured-area/cameras/:id/users", async (req, reply) => {
    const { user_id } = req.body || {};
    if (!user_id) return reply.code(400).send({ message: "user_id required" });
    const result = await SecuredAreaService.addAllowedUser(req.db, req.params.id, user_id);
    const [uRows, cRows] = await Promise.all([
      req.db.query(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [user_id]),
      req.db.query(`SELECT name FROM cameras WHERE id = $1 LIMIT 1`, [req.params.id]),
    ]);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "secured_area.add_user", entity_type: "secured_area", entity_name: `${uRows?.[0]?.name || ""} → ${cRows?.[0]?.name || ""}`, ip: req.ip });
    return result;
  });

  fastify.delete("/secured-area/cameras/:id/users/:uid", async (req) => {
    const [uRows, cRows] = await Promise.all([
      req.db.query(`SELECT name FROM users WHERE id = $1 LIMIT 1`, [req.params.uid]),
      req.db.query(`SELECT name FROM cameras WHERE id = $1 LIMIT 1`, [req.params.id]),
    ]);
    const result = await SecuredAreaService.removeAllowedUser(req.db, req.params.id, req.params.uid);
    AuditService.log(req.db, { actor_id: req.user?.id, action: "secured_area.remove_user", entity_type: "secured_area", entity_name: `${uRows?.[0]?.name || ""} from ${cRows?.[0]?.name || ""}`, ip: req.ip });
    return result;
  });
  fastify.get("/secured-area/violations",               async (req)        => SecuredAreaService.getViolations(req.db, req.query));
}
