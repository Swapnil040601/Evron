// Converts "2026-05-22" + "17:00" or "17:00:30" → "2026_05_22_17_00_30"
function toNvrTime(date, time) {
  const [y, m, d] = date.split("-");
  const [hh, mm, ss = "00"] = time.split(":");
  return `${y}_${m}_${d}_${hh}_${mm}_${ss.padStart(2, "0")}`;
}

function toHikvisionTime(date, time) {
  const [y, m, d] = date.split("-");
  const [hh, mm, ss = "00"] = time.split(":");
  return `${y}${m}${d}T${hh}${mm}${ss.padStart(2, "0")}Z`;
}

function nvrBase(nvr) {
  const parsed = parseNvrEndpoint(nvr);
  const { host, port, username = "", password = "" } = parsed;
  const hasUser = String(username || "").trim() !== "";
  const creds = hasUser
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password || "")}@`
    : "";
  return `rtsp://${creds}${host}:${port || 554}`;
}

export function parseNvrEndpoint(nvr = {}) {
  let raw = String(nvr.ip || "").trim();
  let port = nvr.port || 554;
  let username = nvr.username || "";
  let password = nvr.password || "";

  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(raw)) {
    try {
      const url = new URL(raw);
      raw = url.hostname;
      if (url.port) port = Number(url.port);
      if (!username && url.username) username = decodeURIComponent(url.username);
      if (!password && url.password) password = decodeURIComponent(url.password);
    } catch (_) {
      raw = raw.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, "").split("/")[0];
    }
  }

  raw = raw.split("/")[0];

  if (raw.includes("@")) {
    const [creds, hostPart] = raw.split("@");
    raw = hostPart || raw;
    const [user, pass = ""] = creds.split(":");
    if (!username && user) username = decodeURIComponent(user);
    if (!password && pass) password = decodeURIComponent(pass);
  }

  const hostPort = raw.match(/^\[([^\]]+)\](?::(\d+))?$/) || raw.match(/^([^:]+)(?::(\d+))?$/);
  const host = hostPort?.[1] || raw;
  if (hostPort?.[2]) port = Number(hostPort[2]);

  return { host, port, username, password };
}

function directCameraUrl(camera, streamType = "main") {
  return streamType === "main" ? camera.url : (camera.url2 || camera.url);
}

function hikvisionLiveChannel(channel, streamType = "main") {
  const raw = String(channel || "").trim();
  if (!raw) return null;

  const streamSuffix = streamType === "main" ? "01" : streamType === "sub2" ? "03" : "02";
  if (/^\d+$/.test(raw)) {
    // Accept either NVR channel number (12 -> 1201) or full stream id (1201).
    if (raw.length >= 3 && /0[12]$/.test(raw)) {
      return `${raw.slice(0, -2)}${streamSuffix}`;
    }
    return String(Number(raw) * 100 + Number(streamSuffix));
  }

  return `${raw}${streamSuffix}`;
}

function hikvisionPlaybackTrack(channel) {
  const liveChannel = hikvisionLiveChannel(channel, "main");
  return liveChannel || null;
}

function genericLivePath(channel, streamType = "main") {
  const raw = String(channel || "").trim();
  if (!raw) return null;
  if (/^\/|^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(raw)) return raw;

  return `/camera${raw}`;
}

/**
 * Build the live RTSP URL for a camera.
 * @param {object} camera  - camera row (must include url, url2, channel)
 * @param {object|null} nvr - nvr row, or null for direct-URL cameras
 * @param {"main"|"sub"|"sub2"} streamType
 */
export function buildLiveRtspUrl(camera, nvr, streamType = "main") {
  if (!nvr) {
    return directCameraUrl(camera, streamType);
  }

  if (!camera.channel) {
    return directCameraUrl(camera, streamType);
  }

  const base = nvrBase(nvr);
  const ch = camera.channel;

  switch (String(nvr.brand || "").toLowerCase().trim()) {
    case "cpplus":
    case "dahua": {
      const subtype = streamType === "main" ? 0 : streamType === "sub2" ? 2 : 1;
      return `${base}/cam/realmonitor?channel=${ch}&subtype=${subtype}`;
    }
    case "hikvision": {
      return `${base}/Streaming/Channels/${hikvisionLiveChannel(ch, streamType)}`;
    }
    case "local": {
      // File path stored in nvr.ip; fall back to camera url if set
      return directCameraUrl(camera, streamType) || nvr.ip || null;
    }
    case "generic":
    default: {
      const storedUrl = directCameraUrl(camera, streamType);
      if (storedUrl) return storedUrl;

      const path = genericLivePath(ch, streamType);
      if (!path) return null;
      if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path)) return path;
      return `${base}${path}`;
    }
  }
}

/**
 * Build the playback RTSP URL for an NVR camera.
 * @param {object} nvr
 * @param {number} channel
 * @param {string} date   - "YYYY-MM-DD"
 * @param {string} start  - "HH:MM"
 * @param {string} end    - "HH:MM"
 */
export function buildPlaybackRtspUrl(nvr, channel, date, start, end) {
  const base = nvrBase(nvr);
  const starttime = toNvrTime(date, start);
  const endtime   = toNvrTime(date, end);

  switch (String(nvr.brand || "").toLowerCase().trim()) {
    case "cpplus":
    case "dahua":
      return `${base}/cam/playback?channel=${channel}&starttime=${starttime}&endtime=${endtime}`;
    case "hikvision": {
      const hikStart = toHikvisionTime(date, start);
      const hikEnd   = toHikvisionTime(date, end);
      return `${base}/Streaming/tracks/${hikvisionPlaybackTrack(channel)}?starttime=${hikStart}&endtime=${hikEnd}`;
    }
    default:
      return null;
  }
}

/**
 * Fetch camera + its NVR in one query, return the resolved RTSP URL.
 * Used by both live preview and playback routes.
 */
export async function resolveCameraRtspUrl(db, cameraId, streamType = null) {
  const rows = await db.query(
    `SELECT c.id, c.url, c.url2, c.channel, c.live_view_stream,
            n.brand, n.ip, n.port, n.username, n.password AS nvr_password
     FROM cameras c
     LEFT JOIN nvrs n ON c.nvr_id = n.id
     WHERE c.id = $1`,
    [cameraId]
  );
  const cam = rows?.[0];
  if (!cam) return null;

  const nvr = cam.brand ? {
    brand:    cam.brand,
    ip:       cam.ip,
    port:     cam.port,
    username: cam.username,
    password: cam.nvr_password,
  } : null;

  const effectiveStreamType = streamType || cam.live_view_stream || "sub";
  return buildLiveRtspUrl(cam, nvr, effectiveStreamType);
}
