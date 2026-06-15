import { EmailService } from "../services/email.service.js";

export const EmailController = {
  testSmtp: async (req, reply) => {
    try {
      return await EmailService.testConnection(req.db);
    } catch (err) {
      return reply.code(400).send({ success: false, message: err.message });
    }
  },

  sendPersonReport: async (req, reply) => {
    try {
      const { user_id, from, to, recipient } = req.body || {};
      if (!user_id || !from || !to) return reply.code(400).send({ message: "user_id, from and to are required" });
      return await EmailService.sendPersonReport(req.db, user_id, from, to, recipient || null);
    } catch (err) {
      return reply.code(400).send({ success: false, message: err.message });
    }
  },

  getLogs: async (req, reply) => {
    return await EmailService.getLogs(req.db, req.query || {});
  },
};
