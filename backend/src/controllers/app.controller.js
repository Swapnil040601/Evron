import { AppService } from "../services/app.service.js";

export const AppController = {

  app: async (req, reply) => {
    try {
      // Read from settings if available, fall back to defaults
      const rows = await req.db.query(
        `SELECT key, value FROM settings WHERE key IN ('app_name','app_tagline','app_logo_url','recaptcha_site_key')`
      ).catch(() => []);
      const cfg = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
      return {
        name:              cfg.app_name       || "AI Vision",
        tag_line:          cfg.app_tagline    || "Business Suite",
        logo_url:          cfg.app_logo_url   || "",
        recaptcha_site_key: cfg.recaptcha_site_key || "",
      };
    } catch (err) {
      return { name: "AI Vision", tag_line: "Business Suite", logo_url: "", recaptcha_site_key: "" };
    }
  },

  configs: async (req, reply) => {
    try {
      return await AppService.configs(req.db);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },

  options: async (req, reply) => {
    try {
      return await AppService.options(req.db);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },

  dashboardData: async (req, reply) => {
    try {

      const { date } = req.body;
      return await AppService.dashboardData(req.db, date);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },

  dashboardExport: async (req, reply) => {
    try {

      const { date } = req.body;
      return await AppService.dashboardExport(req.db, date);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },

  employeeReport: async (req, reply) => {
    try {
      const { date } = req.body;
      return await AppService.employeeReport(req.db, req.params.user_id, date);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },

  employeeExport: async (req, reply) => {
    try {
      const { user_id, date } = req.body;
      return await AppService.employeeExport(req.db, user_id, date);
    } catch (err) {
      return reply.code(500).send({ message: err.message });
    }
  },
};