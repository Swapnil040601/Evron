import nodemailer from "nodemailer";
import { SettingsService } from "./settings.service.js";
import { CanteenService } from "./canteen.service.js";

function fmtHours(hours) {
  const total = Math.round(Number(hours || 0) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtDuration(secs) {
  const total = Math.round(Number(secs || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function statusColor(status) {
  const map = {
    Present: "#d1fae5",  Absent: "#fee2e2",
    Holiday: "#dbeafe",  "Half Day": "#fef3c7",
    "On Leave": "#dbeafe",
  };
  return map[status] || "#f3f4f6";
}

function buildPersonReportHtml(data) {
  const { user, summary = {}, daily_attendance = [], area_breakdown = [], canteen_visits = [] } = data;

  const dailyRows = daily_attendance.map(day => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${fmtDate(day.date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <span style="background:${statusColor(day.status)};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;color:#374151;">${day.status || "—"}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${fmtTime(day.login_time)} / ${fmtTime(day.logout_time)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${fmtDuration(day.camera_seconds)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:${Number(day.late_minutes) > 0 ? "#d97706" : "#9ca3af"};">${Number(day.late_minutes) > 0 ? `${day.late_minutes}m` : "—"}</td>
    </tr>
  `).join("");

  const areaRows = area_breakdown.map(a => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${a.camera_name || "—"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${a.camera_type || "work_area"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${fmtHours(a.total_hours)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${a.sessions}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:28px 32px;color:#ffffff;">
          <h1 style="margin:0;font-size:22px;font-weight:700;">Person Report</h1>
          <p style="margin:6px 0 0;font-size:14px;opacity:0.85;">${user.name} &mdash; ${data.from} to ${data.to}</p>
          <p style="margin:2px 0 0;font-size:12px;opacity:0.65;">${[user.code, user.department].filter(Boolean).join(" · ")}</p>
        </td>
      </tr>

      <!-- Summary cards -->
      <tr>
        <td style="padding:24px 32px 12px;">
          <table width="100%" cellpadding="0" cellspacing="8">
            <tr>
              <td width="25%" style="background:#f0fdf4;border-radius:8px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Attendance</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111827;">${summary.attendance_pct || 0}%</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">${summary.present_days || 0}/${summary.workable_days || 0} days</p>
              </td>
              <td width="25%" style="background:#eff6ff;border-radius:8px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Work Time</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111827;">${fmtHours(summary.total_hours)}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">${fmtHours(summary.productive_hours)} productive</p>
              </td>
              <td width="25%" style="background:#fff7ed;border-radius:8px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">Late / Early</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111827;">${summary.late_days || 0} / ${summary.early_exit_days || 0}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">days</p>
              </td>
              <td width="25%" style="background:#fdf4ff;border-radius:8px;padding:14px;text-align:center;">
                <p style="margin:0;font-size:10px;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em;">360 Score</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#111827;">${summary.consistency_score || 0}</p>
                <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">out of 100</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Daily attendance -->
      <tr>
        <td style="padding:16px 32px 8px;">
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;">Daily Attendance</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Date</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Status</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">In / Out</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Work</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Late</th>
            </tr>
            ${dailyRows || '<tr><td colspan="5" style="padding:16px 12px;color:#9ca3af;font-size:13px;text-align:center;">No records</td></tr>'}
          </table>
        </td>
      </tr>

      ${area_breakdown.length > 0 ? `
      <!-- Area breakdown -->
      <tr>
        <td style="padding:16px 32px 8px;">
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;">Camera Area Breakdown</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Camera</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Type</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Hours</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Sessions</th>
            </tr>
            ${areaRows}
          </table>
        </td>
      </tr>` : ""}

      ${canteen_visits.length > 0 ? `
      <!-- Canteen -->
      <tr>
        <td style="padding:16px 32px 8px;">
          <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">Canteen Visits (${canteen_visits.length})</h3>
          <p style="margin:0;font-size:13px;color:#6b7280;">${canteen_visits.map(v => fmtDate(v.date)).join(", ")}</p>
        </td>
      </tr>` : ""}

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Generated by AI Vision &mdash; ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export const EmailService = {
  getTransporter: async (db) => {
    const provider = (await SettingsService.get(db, "email_provider")) || "smtp";
    const fromName = (await SettingsService.get(db, "smtp_from_name")) || "AI Vision";

    if (provider === "google") {
      const [clientId, clientSecret, refreshToken, senderEmail] = await Promise.all([
        SettingsService.get(db, "google_client_id"),
        SettingsService.get(db, "google_client_secret"),
        SettingsService.get(db, "google_refresh_token"),
        SettingsService.get(db, "google_sender_email"),
      ]);
      if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
        throw new Error("Google OAuth2 not fully configured — set Client ID, Client Secret, Refresh Token and Sender Email in Settings > Email");
      }
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: senderEmail,
          clientId,
          clientSecret,
          refreshToken,
        },
      });
      const from = `"${fromName}" <${senderEmail}>`;
      return { transporter, from };
    }

    if (provider === "microsoft") {
      const [clientId, clientSecret, refreshToken, tenantId, senderEmail] = await Promise.all([
        SettingsService.get(db, "ms_client_id"),
        SettingsService.get(db, "ms_client_secret"),
        SettingsService.get(db, "ms_refresh_token"),
        SettingsService.get(db, "ms_tenant_id"),
        SettingsService.get(db, "ms_sender_email"),
      ]);
      if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
        throw new Error("Microsoft OAuth2 not fully configured — set Client ID, Client Secret, Refresh Token and Sender Email in Settings > Email");
      }
      const tenant = tenantId || "common";
      const transporter = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false,
        auth: {
          type: "OAuth2",
          user: senderEmail,
          clientId,
          clientSecret,
          refreshToken,
          accessUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
          scope: "https://outlook.office365.com/.default",
        },
      });
      const from = `"${fromName}" <${senderEmail}>`;
      return { transporter, from };
    }

    // Default: SMTP
    const [host, port, user, pass, fromEmail, secure] = await Promise.all([
      SettingsService.get(db, "smtp_host"),
      SettingsService.get(db, "smtp_port"),
      SettingsService.get(db, "smtp_user"),
      SettingsService.get(db, "smtp_pass"),
      SettingsService.get(db, "smtp_from_email"),
      SettingsService.get(db, "smtp_secure"),
    ]);
    if (!host || !user || !pass) throw new Error("SMTP not configured — set host, username and password in Settings > Email");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port || 587),
      secure: secure === "true" || secure === true,
      auth: { user, pass },
    });
    const from = `"${fromName}" <${fromEmail || user}>`;
    return { transporter, from };
  },

  testConnection: async (db) => {
    const { transporter } = await EmailService.getTransporter(db);
    await transporter.verify();
    const provider = (await SettingsService.get(db, "email_provider")) || "smtp";
    const labels = { smtp: "SMTP", google: "Google OAuth2", microsoft: "Microsoft OAuth2" };
    return { success: true, message: `${labels[provider] || "Email"} connection successful` };
  },

  sendPersonReport: async (db, userId, from, to, recipientOverride = null) => {
    const data = await CanteenService.getPersonReport(db, userId, from, to);
    if (!data) throw new Error("User not found");

    const toEmail = recipientOverride || data.user.email;
    if (!toEmail) throw new Error("Employee has no email address on file");

    const { transporter, from: fromAddr } = await EmailService.getTransporter(db);

    const subject = `Person Report: ${data.user.name} — ${from} to ${to}`;
    const html = buildPersonReportHtml(data);

    try {
      await transporter.sendMail({ from: fromAddr, to: toEmail, subject, html });

      await db.query(`
        INSERT INTO email_logs (type, recipient_email, recipient_name, subject, user_id, status, report_from, report_to)
        VALUES ('person_report', $1, $2, $3, $4, 'sent', $5, $6)
      `, [toEmail, data.user.name, subject, userId, from, to]);

      return { success: true, message: `Report sent to ${toEmail}` };
    } catch (err) {
      await db.query(`
        INSERT INTO email_logs (type, recipient_email, recipient_name, subject, user_id, status, error_message, report_from, report_to)
        VALUES ('person_report', $1, $2, $3, $4, 'failed', $5, $6, $7)
      `, [toEmail, data.user.name, subject, userId, err.message, from, to]);
      throw err;
    }
  },

  // Generic raw email — used for password reset etc.
  sendRaw: async (db, { to, subject, html }) => {
    const { transporter, from: fromAddr } = await EmailService.getTransporter(db);
    await transporter.sendMail({ from: fromAddr, to, subject, html });
  },

  getLogs: async (db, filters = {}) => {
    const limit = Number(filters.limit || 50);
    const offset = (Number(filters.page || 1) - 1) * limit;

    const rows = await db.query(`
      SELECT el.id, el.type, el.recipient_email, el.recipient_name, el.subject,
             el.status, el.error_message, el.report_from, el.report_to, el.sent_at,
             u.name AS user_name
      FROM email_logs el
      LEFT JOIN users u ON u.id = el.user_id
      ORDER BY el.sent_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countRows = await db.query(`SELECT COUNT(*) AS total FROM email_logs`);
    const total = Number(countRows?.[0]?.total || 0);

    return {
      rows: rows || [],
      pagination: { page: Number(filters.page || 1), limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },
};
