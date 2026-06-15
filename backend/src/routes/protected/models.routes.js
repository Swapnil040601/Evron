import { ModelController } from "../../controllers/model.controller.js";

export default async function modelRoutes(fastify, opts) {
  fastify.get("/model/index/:name", ModelController.list);
  fastify.get("/model/view/:name/:id", ModelController.get);
  fastify.post("/model/save/:name", ModelController.create);
  fastify.post("/model/update/:name/:id", ModelController.update);
  fastify.post("/model/camera/bulk-update", ModelController.bulkUpdateCameras);
  fastify.post("/model/delete/:name/:id", ModelController.delete);
}