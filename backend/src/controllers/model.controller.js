import { ModelService } from "../services/model.service.js";

export const ModelController = {
  list: async (req, reply) => {
    return await ModelService.getAll(req.db, req.params.name);
  },

  get: async (req, reply) => {
    const item = await ModelService.getOne(req.db, req.params.name, req.params.id);
    if (!item) return reply.code(404).send({ message: "Not found" });
    return item;
  },

  create: async (req, reply) => {
    const id = await ModelService.create(req.db, req.params.name, req.body);
    return { id, message: `${req.params.name} created successfully` };
  },

  update: async (req, reply) => {
    await ModelService.update(req.db, req.params.name, req.params.id, req.body);
    return { message: `${req.params.name} updated successfully` };
  },

  delete: async (req, reply) => {
    await ModelService.delete(req.db, req.params.name, req.params.id);
    return { message: `${req.params.name} deleted successfully` };
  },


  bulkUpdateCameras: async (req, reply) => {
    try {
      const result = await ModelService.bulkUpdateCameras(req.db, req.body);
      return {
        ...result,
        message: `${result.affected} camera${result.affected === 1 ? "" : "s"} updated successfully`,
      };
    } catch (err) {
      return reply.code(err.statusCode || 500).send({ message: err.message });
    }
  },
};
