function distMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectDwells(pings, radiusM = 300, minMinutes = 10) {
  if (!pings.length) return [];
  const events = [];
  let group = [pings[0]];

  const flushGroup = () => {
    if (!group.length) return;
    const first = group[0];
    const last = group[group.length - 1];
    const durMin = (new Date(last.created_at) - new Date(first.created_at)) / 60000;
    const avgLat = group.reduce((s, p) => s + parseFloat(p.latitude), 0) / group.length;
    const avgLng = group.reduce((s, p) => s + parseFloat(p.longitude), 0) / group.length;
    events.push({
      type: durMin >= minMinutes ? 'stay' : 'move',
      start: first.created_at,
      end: last.created_at,
      duration_minutes: Math.round(durMin),
      lat: avgLat,
      lng: avgLng,
      ping_count: group.length,
      wifi_ssid: last.wifi_ssid || null,
      last_app: last.last_app || null,
    });
  };

  for (let i = 1; i < pings.length; i++) {
    const prev = pings[i - 1];
    const curr = pings[i];
    const d = distMeters(
      parseFloat(prev.latitude), parseFloat(prev.longitude),
      parseFloat(curr.latitude), parseFloat(curr.longitude)
    );
    if (d <= radiusM) {
      group.push(curr);
    } else {
      flushGroup();
      group = [curr];
    }
  }
  flushGroup();
  return events;
}

export default async function locationRoutes(fastify) {
  // Employee: post GPS ping every 30s
  fastify.post("/me/location", async (req, reply) => {
    const {
      latitude, longitude, accuracy,
      walk_dist_m, wifi_ssid, network_type,
      last_app, is_dev_mode,
      other_app_opens, app_opens_detail,
    } = req.body || {};

    if (latitude == null || longitude == null)
      return reply.code(400).send({ message: "latitude and longitude required" });

    await req.db.query(`
      INSERT INTO location_logs
        (user_id, latitude, longitude, accuracy, walk_dist_m, wifi_ssid, network_type, last_app, is_dev_mode)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      req.user.id,
      latitude, longitude,
      accuracy || null,
      walk_dist_m || 0,
      wifi_ssid || null,
      network_type || null,
      last_app || null,
      is_dev_mode || false,
    ]);

    return { ok: true };
  });

  // Admin: latest position per employee (for live map)
  fastify.get("/employee-locations", async (req) => {
    const rows = await req.db.query(`
      SELECT DISTINCT ON (l.user_id)
        l.user_id,
        u.name   AS user_name,
        u.code   AS employee_code,
        u.department,
        u.avatar,
        l.latitude,
        l.longitude,
        l.accuracy,
        l.walk_dist_m,
        l.wifi_ssid,
        l.network_type,
        l.last_app,
        l.is_dev_mode,
        l.created_at AS updated_at
      FROM location_logs l
      JOIN users u ON u.id = l.user_id
      WHERE l.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY l.user_id, l.created_at DESC
    `);
    return rows || [];
  });

  // Admin: full location history with dwell analysis
  fastify.get("/location-logs", async (req) => {
    const { user_id, from, to, limit = 5000 } = req.query;
    const clauses = [];
    const vals = [];
    let i = 1;
    if (user_id) { clauses.push(`l.user_id = $${i++}`); vals.push(Number(user_id)); }
    if (from)    { clauses.push(`l.created_at >= $${i++}`); vals.push(from); }
    if (to)      { clauses.push(`l.created_at < ($${i++}::date + 1)`); vals.push(to); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    vals.push(Number(limit));

    const rows = await req.db.query(`
      SELECT l.*, u.name AS user_name, u.code AS employee_code, u.department, u.avatar
      FROM location_logs l
      JOIN users u ON u.id = l.user_id
      ${where}
      ORDER BY l.user_id, l.created_at ASC
      LIMIT $${i}
    `, vals);

    const byUser = {};
    for (const r of (rows || [])) {
      if (!byUser[r.user_id]) {
        byUser[r.user_id] = {
          user_name: r.user_name,
          employee_code: r.employee_code,
          department: r.department,
          avatar: r.avatar,
          pings: [],
        };
      }
      byUser[r.user_id].pings.push(r);
    }

    return Object.entries(byUser).map(([uid, data]) => ({
      user_id: Number(uid),
      user_name: data.user_name,
      employee_code: data.employee_code,
      department: data.department,
      avatar: data.avatar,
      total_pings: data.pings.length,
      events: detectDwells(data.pings),
    }));
  });

  // Admin: export CSV of raw pings
  fastify.get("/location-logs/export", async (req, reply) => {
    const { user_id, from, to } = req.query;
    const clauses = [];
    const vals = [];
    let i = 1;
    if (user_id) { clauses.push(`l.user_id = $${i++}`); vals.push(Number(user_id)); }
    if (from)    { clauses.push(`l.created_at >= $${i++}`); vals.push(from); }
    if (to)      { clauses.push(`l.created_at < ($${i++}::date + 1)`); vals.push(to); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const rows = await req.db.query(`
      SELECT
        u.name AS employee_name, u.code AS employee_code, u.department,
        l.latitude, l.longitude, l.accuracy, l.walk_dist_m,
        l.wifi_ssid, l.network_type, l.last_app,
        l.is_dev_mode, l.created_at
      FROM location_logs l
      JOIN users u ON u.id = l.user_id
      ${where}
      ORDER BY l.user_id, l.created_at ASC
      LIMIT 100000
    `, vals);

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = "Employee,Code,Department,Latitude,Longitude,Accuracy (m),Walk Distance (m),Wi-Fi SSID,Network,Last App,Developer Mode,Timestamp";
    const lines = (rows || []).map(r => [
      r.employee_name, r.employee_code, r.department,
      r.latitude, r.longitude,
      r.accuracy ?? '', r.walk_dist_m ?? 0,
      r.wifi_ssid ?? '', r.network_type ?? '', r.last_app ?? '',
      r.is_dev_mode ? 'Yes' : 'No',
      new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ].map(esc).join(","));

    const csv = [header, ...lines].join("\n");
    const fname = `location-logs-${from || 'all'}-to-${to || 'all'}.csv`;
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="${fname}"`);
    return reply.send(csv);
  });
}