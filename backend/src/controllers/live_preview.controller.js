import LivePreviewService from "../services/live_preview.service.js";

export const LivePreviewController = {
  async hlsStart(request, reply) {
    try {
      const result = await LivePreviewService.hlsStart(request.body, request.db);
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(error.statusCode || 500).send({
        success: false,
        message: error.message || "Failed to start HLS stream",
      });
    }
  },


  async start(request, reply) {
    try {
      const result = await LivePreviewService.start(request.body, request.db);
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(error.statusCode || 500).send({
        success: false,
        message: error.message || "Failed to start live preview",
      });
    }
  },

  async stop(request, reply) {
    try {
      const result = await LivePreviewService.stop(request.body);
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.code(error.statusCode || 500).send({
        success: false,
        message: error.message || "Failed to stop live preview",
      });
    }
  },

  async stream(request, reply) {
    try {
      await LivePreviewService.stream(request, reply);
    } catch (error) {
      request.log.error(error);

      if (!reply.sent) {
        return reply.code(error.statusCode || 500).send({
          success: false,
          message: error.message || "Failed to stream live preview",
        });
      }
    }
  },
};