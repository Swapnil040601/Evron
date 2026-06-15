import { AuthenticationService } from "../services/authentication.service.js";
import { EmailService } from "../services/email.service.js";

export const AuthenticationController = {
  login: async (req, reply) => {
    try {
      return await AuthenticationService.login(req.server, req.db, req.body);
    } catch (err) {
      return reply.code(401).send({ message: err.message });
    }
  },

  register: async (req, reply) => {
    try {
      return await AuthenticationService.register(req.db, req.body);
    } catch (err) {
      return reply.code(401).send({ message: err.message });
    }
  },

  changePassword: async (req, reply) => {
    try {
      const userId = req.user.id;
      return await AuthenticationService.changePassword(req.db, userId, req.body);
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },

  forgotPassword: async (req, reply) => {
    try {
      const { email } = req.body || {};
      if (!email) return reply.code(400).send({ message: "Email is required" });

      // Build a send-email closure using the configured SMTP
      const sendResetEmail = async (toEmail, toName, token) => {
        const appRows = await req.db.query(`SELECT key, value FROM settings WHERE key IN ('app_name','app_tagline') `);
        const appCfg = Object.fromEntries((appRows || []).map(r => [r.key, r.value]));
        const appName = appCfg.app_name || "AI Vision";
        const resetUrl = `${req.headers.origin || "http://localhost:5173"}/reset-password?token=${token}`;
        await EmailService.sendRaw(req.db, {
          to: toEmail,
          subject: `Reset your ${appName} password`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Reset your password</h2>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Hi ${toName || toEmail}, click the button below to set a new password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset Password</a>
              <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">If you didn't request this, ignore this email. Your password won't change.</p>
            </div>
          `,
        });
      };

      return await AuthenticationService.forgotPassword(req.db, email, sendResetEmail);
    } catch (err) {
      // Always return success message to prevent enumeration
      return { message: "If that email is registered you will receive a reset link." };
    }
  },

  resetPassword: async (req, reply) => {
    try {
      const { token, new_password } = req.body || {};
      return await AuthenticationService.resetPassword(req.db, token, new_password);
    } catch (err) {
      return reply.code(400).send({ message: err.message });
    }
  },
};
