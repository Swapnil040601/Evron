import { createHash, randomBytes } from "crypto";
import { execSync } from "child_process";
import fs from "fs";

// ── Alert config cache ────────────────────────────────────────────────────────

let _alertConfig = null;
let _configLoadedAt = 0;

async function getAlertConfig(db) {
  // Refresh every 5 minutes
  if (_alertConfig && (Date.now() - _configLoadedAt) < 5 * 60 * 1000) return _alertConfig;
  try {
    const rows = await db.query(`SELECT * FROM alert_configs WHERE is_default = true LIMIT 1`);
    _alertConfig = rows?.[0] || null;
    _configLoadedAt = Date.now();
  } catch {
    // alert_configs table may not exist yet (before migration)
  }
  return _alertConfig || {
    disk_warning_pct: 85, disk_critical_pct: 95,
    nvr_offline_delay_sec: 60, cam_offline_delay_sec: 120,
  };
}

// ── Event type → alert schema mapping ────────────────────────────────────────

const EVENT_MAP = {
  VMD:                  { type: "motion_detected",    severity: "info",     label: "Motion detected" },
  videoloss:            { type: "video_loss",          severity: "warning",  label: "Video loss" },
  shelteralarm:         { type: "tampering",           severity: "warning",  label: "Camera tampering / obstruction" },
  scenechangedetection: { type: "scene_change",        severity: "info",     label: "Scene change detected" },
  linedetection:        { type: "line_crossing",       severity: "warning",  label: "Line crossing detected" },
  fielddetection:       { type: "intrusion",           severity: "warning",  label: "Perimeter breach" },
  facedetection:        { type: "face_detected",       severity: "info",     label: "Face detected" },
  ANPR:                 { type: "license_plate",       severity: "info",     label: "License plate detected" },
  diskfull:             { type: "nvr_disk_full",       severity: "critical", label: "NVR storage full" },
  diskerror:            { type: "nvr_disk_error",      severity: "critical", label: "NVR disk failure" },
  ipconflict:           { type: "ip_conflict",         severity: "warning",  label: "IP address conflict" },
  illaccess:            { type: "unauthorized_access", severity: "critical", label: "Unauthorized NVR access" },
  recordingfailure:     { type: "recording_failure",   severity: "critical", label: "Recording failure" },
  networkfailure:       { type: "nvr_network_failure", severity: "warning",  label: "NVR network failure" },
  HDDStatus:            { type: "hdd_warning",         severity: "warning",  label: "HDD health warning" },
  VideoMotion:          { type: "motion_detected",    severity: "info",     label: "Motion detected" },
  VideoLoss:            { type: "video_loss",          severity: "warning",  label: "Video loss" },
  VideoBlind:           { type: "tampering",           severity: "warning",  label: "Camera obstruction" },
  SceneChange:          { type: "scene_change",        severity: "info",     label: "Scene change detected" },
  CrossLineDetection:   { type: "line_crossing",       severity: "warning",  label: "Line crossing" },
  IntrusionDetection:   { type: "intrusion",           severity: "warning",  label: "Perimeter breach" },
  FaceDetection:        { type: "face_detected",       severity: "info",     label: "Face detected" },
  DiskFull:             { type: "nvr_disk_full",       severity: "critical", label: "NVR storage full" },
  DiskError:            { type: "nvr_disk_error",      severity: "critical", label: "NVR disk failure" },
  IPConflict:           { type: "ip_conflict",         severity: "warning",  label: "IP address conflict" },
  IllegalAccess:        { type: "unauthorized_access", severity: "critical", label: "Unauthorized NVR access" },
  RecordingFailure:     { type: "recording_failure",   severity: "critical", label: "Recording failure" },
  SmartMotionHuman:     { type: "motion_detected",    severity: "info",     label: "Human motion detected" },
  SmartMotionVehicle:   { type: "motion_detected",    severity: "info",     label: "Vehicle motion detected" },
};

const DEDUP_WINDOW = {
  motion_detected:    5 * 60,
  video_loss:         60 * 60,
  tampering:          60 * 60,
  scene_change:       60 * 60,
  line_crossing:      5 * 60,
  intrusion:          5 * 60,
  face_detected:      2 * 60,
  license_plate:      60,
  nvr_disk_full:      60 * 60,
  nvr_disk_error:     60 * 60,
  hdd_warning:        60 * 60,
  ip_conflict:        60 * 60,
  unauthorized_access:15 * 60,
  recording_failure:  60 * 60,
  nvr_network_failure:60 * 60,
  nvr_offline:        15 * 60,
  disk_warning:       60 * 60,
  disk_critical:      60 * 60,
};

function dedupBucket(type, nvrId, channel) {
  const windowSecs = DEDUP_WINDOW[type] || 3600;
  const bucket = Math.floor(Date.now() / 1000 / windowSecs);
  return `nvr_${nvrId}_ch${channel || 0}_${type}_${bucket}`;
}

// ── Digest auth helpers ───────────────────────────────────────────────────────

function parseDigest(wwwAuth) {
  const r = {};
  const re = /(\w+)="([^"]+)"/g;
  let m;
  while ((m = re.exec(wwwAuth)) !== null) r[m[1]] = m[2];
  const q = /qop=([^,"\s]+)/.exec(wwwAuth);
  if (q && !r.qop) r.qop = q[1].trim();
  return r;
}

function buildDigest(username, password, method, urlPath, wwwAuth) {
  const { realm = "", nonce = "", qop } = parseDigest(wwwAuth);
  const ha1 = createHash("md5").update(`${username}:${realm}:${password}`).digest("hex");
  const ha2 = createHash("md5").update(`${method}:${urlPath}`).digest("hex");
  if (qop) {
    const nc = "00000001";
    const cnonce = randomBytes(4).toString("hex");
    const resp = createHash("md5").update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest("hex");
    return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${urlPath}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${resp}"`;
  }
  const resp = createHash("md5").update(`${ha1}:${nonce}:${ha2}`).digest("hex");
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${urlPath}", response="${resp}"`;
}

async function fetchStream(ip, urlPath, username, password, readMs = 12_000) {
  const url = `http://${ip}${urlPath}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), readMs + 5000);
  try {
    const basic = Buffer.from(`${username}:${password}`).toString("base64");
    let res = await fetch(url, { headers: { Authorization: `Basic ${basic}` }, signal: ctrl.signal });
    if (res.status === 401) {
      const www = res.headers.get("WWW-Authenticate") || "";
      if (www.toLowerCase().includes("digest")) {
        const auth = buildDigest(username, password, "GET", urlPath, www);
        res = await fetch(url, { headers: { Authorization: auth }, signal: ctrl.signal });
      }
    }
    if (!res.ok || !res.body) return "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const deadline = Date.now() + readMs;
    try {
      while (Date.now() < deadline) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
      }
    } finally {
      reader.cancel().catch(() => {});
    }
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

// ── Event parsers ─────────────────────────────────────────────────────────────

function parseHikvisionEvents(text) {
  const events = [];
  const blockRe = /<EventNotificationAlert[\s\S]*?<\/EventNotificationAlert>/g;
  let match;
  while ((match = blockRe.exec(text)) !== null) {
    const xml = match[0];
    const get = (tag) => { const m = new RegExp(`<${tag}>([^<]+)</${tag}>`).exec(xml); return m?.[1]?.trim(); };
    const eventType = get("eventType");
    const state = get("eventState");
    const channel = parseInt(get("channelID") || get("videoInputChannelID") || "0");
    if (eventType && state !== "inactive") events.push({ eventType, channel });
  }
  return events;
}

function parseDahuaEvents(text) {
  const events = [];
  const re = /Code=(\w+);action=Start;index=(\d+)/g;
  let m;
  while ((m = re.exec(text)) !== null)
    events.push({ eventType: m[1], channel: parseInt(m[2]) + 1 });
  return events;
}

// ── DB alert insert ───────────────────────────────────────────────────────────

async function insertAlert(db, { type, severity, message, data, dedup_key }) {
  await db.query(
    `INSERT INTO platform_alerts (type, severity, message, data, dedup_key)
     VALUES ($1,$2,$3,$4::jsonb,$5)
     ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING`,
    [type, severity, message, JSON.stringify(data || {}), dedup_key]
  );
}

// ── Per-NVR pollers ───────────────────────────────────────────────────────────

async function pollHikvision(db, nvr, log) {
  try {
    const text = await fetchStream(nvr.ip, "/ISAPI/Event/notification/alertStream", nvr.username, nvr.password);
    const events = parseHikvisionEvents(text);
    for (const { eventType, channel } of events) {
      const mapping = EVENT_MAP[eventType];
      if (!mapping) continue;
      await insertAlert(db, {
        type:      mapping.type,
        severity:  mapping.severity,
        message:   `[${nvr.name}] Ch${channel}: ${mapping.label}`,
        data:      { nvr_id: nvr.id, nvr_name: nvr.name, channel, raw_event: eventType },
        dedup_key: dedupBucket(mapping.type, nvr.id, channel),
      });
    }
    if (events.length) log.info(`[nvrEvent] ${nvr.name}: ${events.length} Hikvision event(s)`);
  } catch (err) {
    if (!String(err?.message).includes("abort"))
      log.debug(`[nvrEvent] Hikvision poll error for ${nvr.name}: ${err.message}`);
  }
}

async function pollDahua(db, nvr, log) {
  try {
    const text = await fetchStream(nvr.ip, "/cgi-bin/eventManager.cgi?action=attach&codes[0]=All", nvr.username, nvr.password);
    const events = parseDahuaEvents(text);
    for (const { eventType, channel } of events) {
      const mapping = EVENT_MAP[eventType];
      if (!mapping) continue;
      await insertAlert(db, {
        type:      mapping.type,
        severity:  mapping.severity,
        message:   `[${nvr.name}] Ch${channel}: ${mapping.label}`,
        data:      { nvr_id: nvr.id, nvr_name: nvr.name, channel, raw_event: eventType },
        dedup_key: dedupBucket(mapping.type, nvr.id, channel),
      });
    }
    if (events.length) log.info(`[nvrEvent] ${nvr.name}: ${events.length} Dahua event(s)`);
  } catch (err) {
    if (!String(err?.message).includes("abort"))
      log.debug(`[nvrEvent] Dahua poll error for ${nvr.name}: ${err.message}`);
  }
}

// ── Disk space alerts (uses alert config thresholds) ─────────────────────────

async function checkDiskAlerts(db, config, log) {
  try {
    const raw = execSync("df -Pk / /app/files /tmp 2>/dev/null || df -Pk /", { timeout: 5000 }).toString();
    const seen = new Set();
    const lines = raw.trim().split("\n").slice(1);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const [filesystem, total, used, , usePctStr, mount] = parts;
      if (seen.has(filesystem)) continue;
      seen.add(filesystem);
      const usePct = parseInt(usePctStr) || 0;
      const totalBytes = (parseInt(total) || 0) * 1024;
      const usedBytes  = (parseInt(used)  || 0) * 1024;
      const freeBytes  = totalBytes - usedBytes;
      const hourBucket = Math.floor(Date.now() / 1000 / 3600);

      if (usePct >= (config.disk_critical_pct ?? 95)) {
        await insertAlert(db, {
          type:      "disk_critical",
          severity:  "critical",
          message:   `Disk critical: ${mount} is ${usePct}% full (${Math.round(freeBytes / 1024 / 1024 / 1024 * 10) / 10} GB free)`,
          data:      { mount, use_pct: usePct, total_bytes: totalBytes, used_bytes: usedBytes, free_bytes: freeBytes },
          dedup_key: `disk_critical_${mount.replace(/\//g, "_")}_${hourBucket}`,
        });
      } else if (usePct >= (config.disk_warning_pct ?? 85)) {
        await insertAlert(db, {
          type:      "disk_warning",
          severity:  "warning",
          message:   `Disk warning: ${mount} is ${usePct}% full (${Math.round(freeBytes / 1024 / 1024 / 1024 * 10) / 10} GB free)`,
          data:      { mount, use_pct: usePct, total_bytes: totalBytes, used_bytes: usedBytes, free_bytes: freeBytes },
          dedup_key: `disk_warning_${mount.replace(/\//g, "_")}_${hourBucket}`,
        });
      }
    }
  } catch (err) {
    log.debug(`[nvrEvent] Disk check error: ${err.message}`);
  }
}

// ── NVR offline tracker (respects nvr_offline_delay_sec from config) ─────────

const _onlineState  = new Map(); // nvrId → boolean
const _offlineSince = new Map(); // nvrId → timestamp when it first went offline

async function checkNvrOnlineAlerts(db, nvrs, config, log) {
  const delaySecs = config?.nvr_offline_delay_sec ?? 60;

  await Promise.allSettled(nvrs.map(async (nvr) => {
    let online = false;
    if (String(nvr.brand || "").toLowerCase() === "local") {
      online = fs.existsSync(String(nvr.ip || ""));
    } else {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`http://${nvr.ip}`, { method: "HEAD", signal: ctrl.signal });
      clearTimeout(t);
      online = res.ok || res.status < 500;
    } catch { online = false; }
    }

    const prev = _onlineState.get(nvr.id);
    _onlineState.set(nvr.id, online);

    if (online) {
      _offlineSince.delete(nvr.id);
    } else {
      // Record when it first went offline
      if (!_offlineSince.has(nvr.id)) {
        _offlineSince.set(nvr.id, Date.now());
        log.warn(`[nvrEvent] NVR went offline: ${nvr.name} (${nvr.ip}) — alert fires after ${delaySecs}s`);
      }

      // Fire alert only after the configured delay
      const offlineForMs = Date.now() - _offlineSince.get(nvr.id);
      if (offlineForMs >= delaySecs * 1000) {
        await insertAlert(db, {
          type:      "nvr_offline",
          severity:  "critical",
          message:   `NVR offline: ${nvr.name} (${nvr.ip})`,
          data:      { nvr_id: nvr.id, nvr_name: nvr.name, ip: nvr.ip, offline_secs: Math.round(offlineForMs / 1000) },
          dedup_key: dedupBucket("nvr_offline", nvr.id, 0),
        });
      }
    }
  }));
}

// ── Service entry point ───────────────────────────────────────────────────────

let _timer = null;

export function startNvrEventService(db, log) {
  if (_timer) return;

  const poll = async () => {
    try {
      const [config, nvrs] = await Promise.all([
        getAlertConfig(db),
        db.query("SELECT id, name, brand, ip, port, username, password FROM nvrs"),
      ]);

      if (!nvrs?.length) return;

      await checkNvrOnlineAlerts(db, nvrs, config, log);
      await checkDiskAlerts(db, config, log);

      await Promise.allSettled(nvrs.map(nvr => {
        if (nvr.brand === "hikvision")                       return pollHikvision(db, nvr, log);
        if (nvr.brand === "cpplus" || nvr.brand === "dahua") return pollDahua(db, nvr, log);
        return Promise.resolve();
      }));
    } catch (err) {
      log.error(`[nvrEvent] poll cycle error: ${err.message}`);
    }
  };

  poll();
  _timer = setInterval(poll, 30_000);
  log.info("[nvrEvent] NVR event service started (30s poll interval)");
}

export function stopNvrEventService() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
