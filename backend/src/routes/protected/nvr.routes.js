import { spawn }                          from "child_process";
import fs                                from "fs";
import path                              from "path";
import { randomUUID, createHash, randomBytes } from "crypto";
import { buildPlaybackRtspUrl, buildLiveRtspUrl } from "../../utils/rtsp.js";

// ── NVR camera auto-discovery ─────────────────────────────────────────────────

const HIKVISION_FALLBACK_CHANNELS = Math.max(0, Number(process.env.HIKVISION_FALLBACK_CHANNELS || 16));
const NVR_CAMERA_PROBE_TIMEOUT_MS = Math.max(1_000, Number(process.env.NVR_CAMERA_PROBE_TIMEOUT_MS || 6_000));
const NVR_SYNC_JOB_TTL_MS = Math.max(60_000, Number(process.env.NVR_SYNC_JOB_TTL_MS || 10 * 60_000));
const nvrSyncJobs = new Map();

function nvrHttpHost(input) {
  const raw = String(input || "").trim();
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(raw)) {
    try {
      return new URL(raw).host;
    } catch (_) {}
  }
  return raw.replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, "").split("/")[0].split("@").pop();
}

function parseDigestChallenge(header) {
  const result = {};
  const re = /(\w+)="([^"]+)"/g;
  let m;
  while ((m = re.exec(header)) !== null) result[m[1]] = m[2];
  const qopM = /(?:^|[\s,])qop=([^,"\s]+)/.exec(header);
  if (qopM && !result.qop) result.qop = qopM[1].trim();
  return result;
}

function buildDigestHeader(username, password, method, urlPath, challenge) {
  const { realm = "", nonce = "", qop } = challenge;
  const ha1 = createHash("md5").update(`${username}:${realm}:${password}`).digest("hex");
  const ha2 = createHash("md5").update(`${method}:${urlPath}`).digest("hex");
  if (qop) {
    const nc = "00000001";
    const cnonce = randomBytes(4).toString("hex");
    const response = createHash("md5").update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest("hex");
    return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${urlPath}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  }
  const response = createHash("md5").update(`${ha1}:${nonce}:${ha2}`).digest("hex");
  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${urlPath}", response="${response}"`;
}

async function fetchNvr(ip, urlPath, username, password, timeoutMs = 10_000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const url   = `http://${nvrHttpHost(ip)}${urlPath}`;
  try {
    const basic = Buffer.from(`${username}:${password}`).toString("base64");
    let res = await fetch(url, { headers: { Authorization: `Basic ${basic}` }, signal: ctrl.signal });
    if (res.status === 401) {
      const www = res.headers.get("WWW-Authenticate") || "";
      if (www.toLowerCase().includes("digest")) {
        const challenge = parseDigestChallenge(www);
        res = await fetch(url, {
          headers: { Authorization: buildDigestHeader(username, password, "GET", urlPath, challenge) },
          signal: ctrl.signal,
        });
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function httpStatusError(status, urlPath) {
  const err = new Error(`HTTP ${status}${urlPath ? ` from ${urlPath}` : ""}`);
  err.status = status;
  return err;
}

async function fetchNvrText(ip, urlPath, username, password) {
  const res = await fetchNvr(ip, urlPath, username, password);
  if (!res.ok) throw httpStatusError(res.status, urlPath);
  return res.text();
}

async function fetchNvrMethod(ip, urlPath, username, password, options = {}) {
  const { method = "GET", body = null, headers = {}, timeoutMs = 10_000 } = options;
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const url   = "http://" + nvrHttpHost(ip) + urlPath;
  try {
    const basic = Buffer.from(`${username}:${password}`).toString("base64");
    const init = { method, headers: { ...headers, Authorization: `Basic ${basic}` }, body, signal: ctrl.signal };
    let res = await fetch(url, init);
    if (res.status === 401) {
      const www = res.headers.get("WWW-Authenticate") || "";
      if (www.toLowerCase().includes("digest")) {
        const challenge = parseDigestChallenge(www);
        res = await fetch(url, {
          method,
          headers: { ...headers, Authorization: buildDigestHeader(username, password, method, urlPath, challenge) },
          body,
          signal: ctrl.signal,
        });
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function textValue(text, re) {
  const m = re.exec(text || "");
  return m?.[1]?.trim() || null;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildStreamWarnings(stream, type) {
  const warnings = [];
  if (!stream) return ["Stream config unavailable"];
  if (type === "sub") {
    if (String(stream.codec || "").toUpperCase() !== "H.264") warnings.push("Substream should use H.264 for browser grids");
    if ((stream.width || 0) > 640 || (stream.height || 0) > 360) warnings.push("Substream resolution is high for multi-camera grids");
    if ((stream.fps || 0) > 12) warnings.push("Substream FPS is high for 24/25 camera grids");
    if ((stream.bitrate || 0) > 768) warnings.push("Substream bitrate is high for grid playback");
  }
  return warnings;
}

function parseCpPlusEncode(text, channel) {
  const idx = Number(channel) - 1;
  const read = (format, prop) => textValue(text, new RegExp("table\\.Encode\\[" + idx + "\\]\\." + format + "\\[0\\]\\.Video\\." + prop + "=([^\\r\\n]+)"));
  const stream = (format) => {
    const resolution = read(format, "resolution") || "";
    const parts = resolution.split("x").map(Number);
    const width = numberOrNull(read(format, "Width")) || (Number.isFinite(parts[0]) ? parts[0] : null);
    const height = numberOrNull(read(format, "Height")) || (Number.isFinite(parts[1]) ? parts[1] : null);
    return {
      codec: read(format, "Compression"),
      resolution: resolution || (width && height ? `${width}x${height}` : null),
      width,
      height,
      fps: numberOrNull(read(format, "FPS")),
      bitrate: numberOrNull(read(format, "BitRate")),
      bitrate_control: read(format, "BitRateControl"),
      gop: numberOrNull(read(format, "GOP")),
    };
  };
  return { main: stream("MainFormat"), sub: stream("ExtraFormat") };
}

function parseHikvisionStreamingXml(xml) {
  const tag = (name) => textValue(xml, new RegExp("<" + name + ">([^<]*)<\\/" + name + ">"));
  const width = numberOrNull(tag("videoResolutionWidth"));
  const height = numberOrNull(tag("videoResolutionHeight"));
  const maxFrameRate = numberOrNull(tag("maxFrameRate"));
  return {
    codec: tag("videoCodecType"),
    resolution: width && height ? `${width}x${height}` : null,
    width,
    height,
    fps: maxFrameRate != null ? maxFrameRate / 100 : null,
    bitrate: numberOrNull(tag("vbrUpperCap")) || numberOrNull(tag("constantBitRate")),
    bitrate_control: tag("videoQualityControlType"),
    gop: numberOrNull(tag("GovLength")),
  };
}

function streamHealthForCamera(camera, main, sub) {
  const warnings = [...buildStreamWarnings(sub, "sub")];
  return {
    camera_id: camera.id,
    camera_name: camera.name,
    channel: camera.channel,
    live_view_stream: camera.live_view_stream || "sub",
    ai_stream: camera.ai_stream || "main",
    main,
    sub,
    warnings,
    ok: warnings.length === 0,
  };
}

async function readNvrStreamInfo(db, nvr) {
  const cameras = await db.query(
    `SELECT id, name, channel, live_view_stream, ai_stream
     FROM cameras WHERE nvr_id = $1 AND channel IS NOT NULL ORDER BY channel`,
    [nvr.id]
  );
  const brand = String(nvr.brand || "").toLowerCase().trim();
  const result = { nvr_id: nvr.id, brand, cameras: [], summary: { total: cameras?.length || 0, warnings: 0, unsupported: 0 } };
  if (!cameras?.length) return result;
  if (brand === "cpplus" || brand === "dahua") {
    const text = await fetchNvrText(nvr.ip, "/cgi-bin/configManager.cgi?action=getConfig&name=Encode", nvr.username, nvr.password);
    result.cameras = cameras.map(camera => {
      const streams = parseCpPlusEncode(text, camera.channel);
      return streamHealthForCamera(camera, streams.main, streams.sub);
    });
  } else if (brand === "hikvision") {
    for (const camera of cameras) {
      const mainId = `${camera.channel}01`;
      const subId = `${camera.channel}02`;
      let main = null;
      let sub = null;
      try { main = parseHikvisionStreamingXml(await fetchNvrText(nvr.ip, `/ISAPI/Streaming/channels/${mainId}`, nvr.username, nvr.password)); } catch (_) {}
      try { sub = parseHikvisionStreamingXml(await fetchNvrText(nvr.ip, `/ISAPI/Streaming/channels/${subId}`, nvr.username, nvr.password)); } catch (_) {}
      result.cameras.push(streamHealthForCamera(camera, main, sub));
    }
  } else {
    result.message = "Stream configuration audit is supported for CP Plus/Dahua and Hikvision NVRs.";
  }
  result.summary.warnings = result.cameras.reduce((sum, c) => sum + c.warnings.length, 0);
  result.summary.unsupported = result.cameras.filter(c => String(c.sub?.codec || "").toUpperCase() !== "H.264").length;
  return result;
}

async function setCpPlusSubProfile(nvr, cameras, profile) {
  const changes = [];
  for (const camera of cameras) {
    const idx = Number(camera.channel) - 1;
    const params = [
      [`Encode[${idx}].ExtraFormat[0].Video.Compression`, "H.264"],
      [`Encode[${idx}].ExtraFormat[0].Video.BitRate`, String(profile.bitrate)],
      [`Encode[${idx}].ExtraFormat[0].Video.FPS`, String(profile.fps)],
      [`Encode[${idx}].ExtraFormat[0].Video.GOP`, String(profile.gop)],
    ];
    if (profile.cpplusResolution) {
      params.push([`Encode[${idx}].ExtraFormat[0].Video.resolution`, profile.cpplusResolution]);
      params.push([`Encode[${idx}].ExtraFormat[0].Video.Width`, String(profile.width)]);
      params.push([`Encode[${idx}].ExtraFormat[0].Video.Height`, String(profile.height)]);
    }
    for (const [key, value] of params) {
      const encodedKey = encodeURIComponent(key).replace(/%5B/g, "[").replace(/%5D/g, "]");
      const urlPath = `/cgi-bin/configManager.cgi?action=setConfig&${encodedKey}=${encodeURIComponent(value)}`;
      const res = await fetchNvrMethod(nvr.ip, urlPath, nvr.username, nvr.password);
      const body = await res.text().catch(() => "");
      changes.push({ channel: camera.channel, key, ok: res.ok && /OK/i.test(body), status: res.status, response: body.trim().slice(0, 120) });
    }
  }
  return changes;
}

async function setHikvisionSubProfile(nvr, cameras, profile) {
  const changes = [];
  for (const camera of cameras) {
    const streamId = `${camera.channel}02`;
    const xml = await fetchNvrText(nvr.ip, `/ISAPI/Streaming/channels/${streamId}`, nvr.username, nvr.password);
    const edited = xml
      .replace(/<videoCodecType>[^<]*<\/videoCodecType>/, "<videoCodecType>H.264</videoCodecType>")
      .replace(/<videoResolutionWidth>[^<]*<\/videoResolutionWidth>/, `<videoResolutionWidth>${profile.width}</videoResolutionWidth>`)
      .replace(/<videoResolutionHeight>[^<]*<\/videoResolutionHeight>/, `<videoResolutionHeight>${profile.height}</videoResolutionHeight>`)
      .replace(/<vbrUpperCap>[^<]*<\/vbrUpperCap>/, `<vbrUpperCap>${profile.bitrate}</vbrUpperCap>`)
      .replace(/<maxFrameRate>[^<]*<\/maxFrameRate>/, `<maxFrameRate>${profile.fps * 100}</maxFrameRate>`)
      .replace(/<GovLength>[^<]*<\/GovLength>/, `<GovLength>${profile.gop}</GovLength>`);
    const res = await fetchNvrMethod(nvr.ip, `/ISAPI/Streaming/channels/${streamId}`, nvr.username, nvr.password, {
      method: "PUT",
      headers: { "Content-Type": "application/xml" },
      body: edited,
    });
    const body = await res.text().catch(() => "");
    changes.push({ channel: camera.channel, stream_id: streamId, ok: res.ok && /<statusString>OK<\/statusString>/i.test(body), status: res.status });
  }
  return changes;
}

async function applySubstreamGridProfile(db, nvr, profile = {}) {
  const normalized = {
    codec: "H.264",
    width: Math.max(1, Number(profile.width || 640)),
    height: Math.max(1, Number(profile.height || 360)),
    cpplusResolution: profile.cpplusResolution || null,
    bitrate: Math.max(64, Number(profile.bitrate || 512)),
    fps: Math.max(1, Number(profile.fps || 10)),
    gop: Math.max(1, Number(profile.gop || 20)),
  };
  const cameras = await db.query(
    `SELECT id, name, channel FROM cameras WHERE nvr_id = $1 AND channel IS NOT NULL ORDER BY channel`,
    [nvr.id]
  );
  const brand = String(nvr.brand || "").toLowerCase().trim();
  let changes = [];
  if (brand === "cpplus" || brand === "dahua") {
    changes = await setCpPlusSubProfile(nvr, cameras || [], normalized);
  } else if (brand === "hikvision") {
    changes = await setHikvisionSubProfile(nvr, cameras || [], normalized);
  } else {
    const err = new Error("Bulk stream profile is supported for CP Plus/Dahua and Hikvision NVRs.");
    err.statusCode = 400;
    throw err;
  }
  return { profile: normalized, changed: changes.filter(c => c.ok).length, attempted: changes.length, changes };
}

function uniqueChannels(channels) {
  const seen = new Set();
  return channels
    .filter(({ channel }) => Number.isInteger(channel) && channel > 0)
    .sort((a, b) => a.channel - b.channel)
    .filter(({ channel }) => {
      if (seen.has(channel)) return false;
      seen.add(channel);
      return true;
    });
}

function parseHikvisionVideoInputChannels(xml) {
  const channels = [];
  const blockRe  = /<VideoInputChannel\b[\s\S]*?<\/VideoInputChannel>/g;
  let block;
  while ((block = blockRe.exec(xml)) !== null) {
    const idM   = /<id>(\d+)<\/id>/.exec(block[0]);
    const nameM = /<name>([^<]*)<\/name>/.exec(block[0]);
    if (!idM) continue;
    const ch = parseInt(idM[1]);
    channels.push({ channel: ch, name: nameM?.[1]?.trim() || `Camera ${ch}` });
  }
  if (channels.length === 0) {
    const portRe = /<inputPort>(\d+)<\/inputPort>/g;
    const seen   = new Set();
    let m;
    while ((m = portRe.exec(xml)) !== null) seen.add(parseInt(m[1]));
    for (const ch of [...seen].sort((a, b) => a - b))
      channels.push({ channel: ch, name: `Camera ${ch}` });
  }
  return uniqueChannels(channels);
}

function parseHikvisionStreamingChannels(xml) {
  const channels = [];
  const blockRe = /<StreamingChannel\b[\s\S]*?<\/StreamingChannel>/g;
  let block;

  while ((block = blockRe.exec(xml)) !== null) {
    const idM = /<id>(\d+)<\/id>/.exec(block[0]);
    const nameM = /<channelName>([^<]*)<\/channelName>/.exec(block[0])
      || /<name>([^<]*)<\/name>/.exec(block[0]);
    if (!idM) continue;

    const streamId = parseInt(idM[1]);
    const streamSuffix = streamId % 100;
    if (streamSuffix !== 1) continue;

    const ch = Math.floor(streamId / 100);
    channels.push({ channel: ch, name: nameM?.[1]?.trim() || `Camera ${ch}` });
  }

  return uniqueChannels(channels);
}

function parseHikvisionInputProxyChannels(xml) {
  const channels = [];
  const blockRe = /<InputProxyChannel\b[\s\S]*?<\/InputProxyChannel>/g;
  let block;

  while ((block = blockRe.exec(xml)) !== null) {
    const idM = /<id>(\d+)<\/id>/.exec(block[0]);
    const nameM = /<name>([^<]*)<\/name>/.exec(block[0]);
    if (!idM) continue;

    const ch = parseInt(idM[1]);
    channels.push({ channel: ch, name: nameM?.[1]?.trim() || `Camera ${ch}` });
  }

  return uniqueChannels(channels);
}

function fallbackHikvisionChannels() {
  return Array.from({ length: HIKVISION_FALLBACK_CHANNELS }, (_, i) => {
    const channel = i + 1;
    return { channel, name: `Camera ${channel}` };
  });
}

function nvrObject(brand, ip, username, password, port = 554) {
  return {
    brand: String(brand || "").toLowerCase().trim(),
    ip,
    port,
    username: username || "",
    password: password || "",
  };
}

function probeCameraStream(rtspUrl, timeoutMs = NVR_CAMERA_PROBE_TIMEOUT_MS) {
  if (!rtspUrl) return Promise.resolve({ ok: false, reason: "No RTSP URL resolved" });

  return new Promise((resolve) => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
    ];
    if (String(rtspUrl).toLowerCase().startsWith("rtsp://")) {
      args.push("-rtsp_transport", "tcp");
    }
    args.push("-i", rtspUrl, "-frames:v", "1", "-f", "null", "-");

    const ff = spawn("ffmpeg", args);
    let done = false;
    let stderr = "";

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (ff.exitCode === null) ff.kill("SIGKILL");
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, reason: `Stream probe timed out after ${Math.round(timeoutMs / 1000)}s` });
    }, timeoutMs);

    ff.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 500) stderr = stderr.slice(-500);
    });
    ff.on("error", (err) => {
      finish({
        ok: false,
        reason: err?.code === "ENOENT" ? "ffmpeg is not installed" : (err?.message || "Could not start stream probe"),
      });
    });
    ff.on("close", (code) => {
      finish({ ok: code === 0, reason: code === 0 ? null : (stderr.trim() || `Stream probe exited with code ${code}`) });
    });
  });
}

async function probeCameraStreams(urls) {
  let lastFailure = { ok: false, reason: "No RTSP URL resolved" };
  for (const rtspUrl of urls.filter(Boolean)) {
    const result = await probeCameraStream(rtspUrl);
    if (result.ok) return result;
    lastFailure = result;
  }
  return lastFailure;
}

async function discoverHikvisionChannels(ip, username, password) {
  const attempts = [
    { path: "/ISAPI/System/Video/inputs/channels", parse: parseHikvisionVideoInputChannels },
    { path: "/ISAPI/Streaming/channels", parse: parseHikvisionStreamingChannels },
    { path: "/ISAPI/ContentMgmt/InputProxy/channels", parse: parseHikvisionInputProxyChannels },
  ];
  const errors = [];

  for (const attempt of attempts) {
    try {
      const xml = await fetchNvrText(ip, attempt.path, username, password);
      const channels = attempt.parse(xml);
      if (channels.length) return channels;
      errors.push(`no channels from ${attempt.path}`);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.some(msg => /HTTP (401|403)\b/.test(msg)) && HIKVISION_FALLBACK_CHANNELS > 0) {
    return fallbackHikvisionChannels();
  }

  throw new Error(errors.join("; ") || "No Hikvision channels found");
}

async function discoverDahuaChannels(ip, username, password) {
  const urlPath = "/cgi-bin/configManager.cgi?action=getConfig&name=ChannelTitle";
  const text = await fetchNvrText(ip, urlPath, username, password);
  const channels = [];
  const re = /table\.ChannelTitle\[(\d+)\]\.Name=(.*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const ch = parseInt(m[1]) + 1;
    channels.push({ channel: ch, name: m[2].trim() || `Camera ${ch}` });
  }
  return channels;
}

async function importCamerasFromNvr(db, nvrId, brand, ip, username, password, port = 554, options = {}) {
  const { onProgress } = options;
  let channels = [];
  if (brand === "local") channels = [{ channel: 1, name: "Local Test Camera" }];
  if (brand === "hikvision")                 channels = await discoverHikvisionChannels(ip, username, password);
  else if (brand === "cpplus" || brand === "dahua") channels = await discoverDahuaChannels(ip, username, password);

  const result = {
    status: "running",
    cameras_found: channels.length,
    cameras_imported: 0,
    cameras_skipped_existing: 0,
    cameras_skipped_offline: 0,
    current_index: 0,
    current_channel: null,
    current_name: null,
    channels: [],
  };
  onProgress?.({ ...result });
  const nvr = nvrObject(brand, ip, username, password, port);

  for (let idx = 0; idx < channels.length; idx++) {
    const { channel, name } = channels[idx];
    result.current_index = idx + 1;
    result.current_channel = channel;
    result.current_name = name;
    onProgress?.({ ...result, phase: "checking" });
    const existing = await db.query(
      `SELECT id FROM cameras WHERE nvr_id = $1 AND channel = $2`,
      [nvrId, channel]
    );
    if (existing?.length) {
      result.cameras_skipped_existing++;
      result.channels.push({ channel, name, status: "skipped_existing", message: "Camera already exists" });
      onProgress?.({ ...result, phase: "skipped_existing" });
      continue;
    }

    const probe = await probeCameraStreams([
      buildLiveRtspUrl({ channel }, nvr, "sub"),
      buildLiveRtspUrl({ channel }, nvr, "main"),
    ]);
    if (!probe.ok) {
      result.cameras_skipped_offline++;
      result.channels.push({ channel, name, status: "skipped_offline", message: probe.reason || "Camera stream unavailable" });
      onProgress?.({ ...result, phase: "skipped_offline" });
      continue;
    }

    await db.query(
      `INSERT INTO cameras (name, nvr_id, channel, camera_type, status, ai_stream, live_view_stream)
       VALUES ($1, $2, $3, 'other', 'Active', 'main', 'sub')`,
      [name, nvrId, channel]
    );
    result.cameras_imported++;
    result.channels.push({ channel, name, status: "added", message: "Camera stream is working" });
    onProgress?.({ ...result, phase: "added" });
  }
  result.status = "complete";
  result.current_channel = null;
  result.current_name = null;
  onProgress?.({ ...result, phase: "complete" });
  return result;
}

function cleanupNvrSyncJobs() {
  const now = Date.now();
  for (const [jobId, job] of nvrSyncJobs.entries()) {
    if (now - job.updated_at > NVR_SYNC_JOB_TTL_MS) nvrSyncJobs.delete(jobId);
  }
}

function startNvrSyncJob(fastify, nvr) {
  cleanupNvrSyncJobs();

  for (const [jobId, job] of nvrSyncJobs.entries()) {
    if (job.nvr_id === nvr.id && job.status === "running") return { jobId, job };
  }

  const jobId = randomUUID();
  const baseJob = {
    job_id: jobId,
    nvr_id: nvr.id,
    status: "running",
    phase: "starting",
    cameras_found: 0,
    cameras_imported: 0,
    cameras_skipped_existing: 0,
    cameras_skipped_offline: 0,
    current_index: 0,
    current_channel: null,
    current_name: null,
    channels: [],
    started_at: Date.now(),
    updated_at: Date.now(),
  };
  nvrSyncJobs.set(jobId, baseJob);

  setImmediate(async () => {
    try {
      const result = await importCamerasFromNvr(
        fastify.dataSource,
        nvr.id,
        nvr.brand,
        nvr.ip,
        nvr.username,
        nvr.password,
        nvr.port,
        {
          onProgress: (progress) => {
            const prev = nvrSyncJobs.get(jobId) || baseJob;
            nvrSyncJobs.set(jobId, {
              ...prev,
              ...progress,
              job_id: jobId,
              nvr_id: nvr.id,
              status: progress.status || "running",
              updated_at: Date.now(),
            });
          },
        }
      );
      nvrSyncJobs.set(jobId, {
        ...baseJob,
        ...result,
        job_id: jobId,
        nvr_id: nvr.id,
        status: "complete",
        phase: "complete",
        updated_at: Date.now(),
      });
      fastify.log.info(`[nvr] sync job ${jobId} complete found=${result.cameras_found} added=${result.cameras_imported} existing=${result.cameras_skipped_existing} offline=${result.cameras_skipped_offline} for nvr ${nvr.id}`);
    } catch (err) {
      const prev = nvrSyncJobs.get(jobId) || baseJob;
      nvrSyncJobs.set(jobId, {
        ...prev,
        status: "failed",
        phase: "failed",
        import_warning: err.message,
        updated_at: Date.now(),
      });
      fastify.log.warn(`[nvr] sync job ${jobId} failed for nvr ${nvr.id}: ${err.message}`);
    }
  });

  return { jobId, job: baseJob };
}

// One playback slot per physical NVR device — avoids exhausting RTSP connection limits.
// nvrId -> { ff, sessionId, cacheKey }
const activeByNvr     = new Map();
// sessionId -> nvrId  (reverse lookup for stop requests)
const activeBySession = new Map();
// "nvrId|cameraId|date|start|end" -> { sessionId, tmpDir, ready }
const cache = new Map();
const NVR_TIMEZONE = process.env.NVR_TIMEZONE || "Asia/Kolkata";
const TODAY_END_GRACE_MINUTES = Number(process.env.NVR_TODAY_END_GRACE_MINUTES || 2);
const LOCAL_PLAYBACK_FILE = process.env.LOCAL_PLAYBACK_FILE || "/app/files/playback/local-test.mp4";
const LOCAL_PLAYBACK_LOOP_SECS = Math.max(1, Number(process.env.LOCAL_PLAYBACK_LOOP_SECS || 300));

function isLocalPlaybackNvr(nvr) {
  return String(nvr?.brand || "").toLowerCase().trim() === "local";
}

function localPlaybackFile(nvr) {
  const configured = String(nvr?.ip || "").trim();
  return configured.startsWith("/") ? configured : LOCAL_PLAYBACK_FILE;
}

function localInputArgs(nvr, startSecs, durationSecs) {
  const seekSecs = Math.max(0, Number(startSecs) || 0) % LOCAL_PLAYBACK_LOOP_SECS;
  const duration = Math.max(1, Number(durationSecs) || 30);
  return [
    "-stream_loop", "-1",
    "-ss", String(seekSecs),
    "-i", localPlaybackFile(nvr),
    "-t", String(duration),
  ];
}

async function teardown(nvrId, sessionId = null) {
  const a = activeByNvr.get(nvrId);
  if (!a) return;
  if (sessionId && a.sessionId !== sessionId) return;
  activeByNvr.delete(nvrId);
  activeBySession.delete(a.sessionId);
  try { a.ff.kill("SIGTERM"); } catch (_) {}
  await new Promise(r => {
    const t = setTimeout(() => { try { a.ff.kill("SIGKILL"); } catch (_) {} r(); }, 1200);
    a.ff.once("close", () => { clearTimeout(t); r(); });
  });
  // Give the NVR a short moment to release its RTSP slot.
  await new Promise(r => setTimeout(r, Number(process.env.NVR_TEARDOWN_GRACE_MS || 500)));
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function minutesFromTime(value) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function timeFromMinutes(value) {
  const minutes = Math.max(0, Math.min(1439, Math.floor(value)));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// Accepts "HH:MM" or "HH:MM:SS" → total seconds (0–86399), or null if invalid.
function parseTimeToSecs(value) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value || "");
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
}

// Seconds → "HH:MM:SS"
function secsToHHMMSS(s) {
  s = Math.max(0, Math.min(86399, Math.floor(s)));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function getNvrNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NVR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date()).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// Works in seconds throughout to preserve second-level precision from the client.
function clampPlaybackRange(date, startSecs, endSecs) {
  const now = getNvrNowParts();
  let safeEndSecs = endSecs;

  if (date === now.date) {
    safeEndSecs = Math.min(endSecs, (now.minutes - TODAY_END_GRACE_MINUTES) * 60);
  }

  if (safeEndSecs > 86399) safeEndSecs = 86399;

  if (safeEndSecs <= startSecs) {
    return {
      ok: false,
      message: date === now.date
        ? "Recording is not available yet for this time. Choose an earlier time."
        : "Select a valid time range with recordings.",
    };
  }

  return { ok: true, startSecs, endSecs: safeEndSecs };
}

// Back-off windows in seconds (0 s, 5 min, 15 min) to work around NVRs that need
// the start time to land on a keyframe or reject requests ahead of an I-frame.
function buildPlaybackWindows(startSecs, endSecs) {
  return [0, 300, 900].map(backSecs => {
    const effStart = Math.max(0, startSecs - backSecs);
    return {
      start: secsToHHMMSS(effStart),
      end:   secsToHHMMSS(endSecs),
      offsetSeconds: startSecs - effStart,
    };
  }).filter((w, i, arr) => i === arr.findIndex(o => o.start === w.start && o.end === w.end));
}

function toClientPlaybackError(error) {
  const msg = String(error || "");
  if (/404|not found/i.test(msg)) {
    return "No recording was found for that time. Try a nearby earlier time or confirm this channel has recording enabled.";
  }
  if (/401|403|unauthorized|forbidden/i.test(msg)) {
    return "NVR rejected the playback login. Check NVR username and password.";
  }
  if (/timed out|timeout|No route|Connection refused/i.test(msg)) {
    return "Could not reach the NVR playback stream. Check the NVR network and RTSP port.";
  }
  return "NVR did not provide footage for this time range.";
}

function sanitizeRtspLog(value) {
  return String(value || "").replace(/rtsp:\/\/([^:\s]+):([^@\s]+)@/g, "rtsp://$1:***@");
}

function hasPlayableManifest(manifestPath) {
  try {
    return fs.existsSync(manifestPath) && fs.readFileSync(manifestPath, "utf8").includes(".ts");
  } catch (_) {
    return false;
  }
}

function waitForManifest(manifestPath, ff, getLastError, timeoutMs = 18_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (hasPlayableManifest(manifestPath)) return resolve();
      if (ff.exitCode !== null) return reject(new Error(getLastError() || "NVR stream ended before playback was ready"));
      if (Date.now() > deadline) return reject(new Error("NVR did not send footage — verify the time range has recordings"));
      setTimeout(check, 120);
    };
    check();
  });
}

// Clean up stale HLS segment dirs left from previous server runs.
try {
  fs.readdirSync("/tmp").filter(f => f.startsWith("nvr_pb_")).forEach(f => {
    try { fs.rmSync(path.join("/tmp", f), { recursive: true, force: true }); } catch (_) {}
  });
} catch (_) {}

export default async function nvrRoutes(fastify) {

  // ── NVR CRUD ────────────────────────────────────────────────────────────────

  fastify.get("/nvrs", async (req) => {
    const rows = await req.db.query(
      `SELECT id, name, brand, ip, port, username, created_at FROM nvrs ORDER BY name`
    );
    return { data: rows || [] };
  });

  fastify.post("/nvrs", async (req, reply) => {
    const { name, brand, ip, port = 554, username, password } = req.body;
    const normalizedBrand = brand || "cpplus";
    if (!name || !ip || (normalizedBrand !== "generic" && normalizedBrand !== "local" && !username)) {
      return reply.code(400).send({ message: "name, ip/source, and username are required" });
    }
    const rows = await req.db.query(
      `INSERT INTO nvrs (name, brand, ip, port, username, password)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, normalizedBrand, ip, port, username || "", password || ""]
    );
    const nvrId = rows[0].id;

    // Fire-and-forget — don't block the response waiting for NVR HTTP discovery
    const ds = fastify.dataSource;
    setImmediate(() => {
      importCamerasFromNvr(ds, nvrId, normalizedBrand, ip, username || "", password || "", port)
        .then(r => fastify.log.info(`[nvr] auto-import found=${r.cameras_found} added=${r.cameras_imported} existing=${r.cameras_skipped_existing} offline=${r.cameras_skipped_offline} for nvr ${nvrId}`))
        .catch(err => fastify.log.warn(`[nvr] auto-import failed for nvr ${nvrId}: ${err.message}`));
    });

    return { id: nvrId, message: "NVR created" };
  });

  fastify.post("/nvrs/:id/sync-cameras", async (req, reply) => {
    const nvrRows = await req.db.query(
      `SELECT id, brand, ip, port, username, password FROM nvrs WHERE id = $1`,
      [req.params.id]
    );
    if (!nvrRows?.length) return reply.code(404).send({ message: "NVR not found" });

    const { jobId, job } = startNvrSyncJob(fastify, nvrRows[0]);
    return { ...job, job_id: jobId };
  });

  fastify.get("/nvrs/:id/sync-cameras/:jobId", async (req, reply) => {
    cleanupNvrSyncJobs();
    const job = nvrSyncJobs.get(req.params.jobId);
    if (!job || String(job.nvr_id) !== String(req.params.id)) {
      return reply.code(404).send({ message: "Sync job not found" });
    }
    return job;
  });

  fastify.post("/nvrs/:id", async (req, reply) => {
    const { name, brand, ip, port, username, password } = req.body;
    const fields = [];
    const vals   = [];
    let i = 1;

    if (name     !== undefined) { fields.push(`name = $${i++}`);     vals.push(name);     }
    if (brand    !== undefined) { fields.push(`brand = $${i++}`);    vals.push(brand);    }
    if (ip       !== undefined) { fields.push(`ip = $${i++}`);       vals.push(ip);       }
    if (port     !== undefined) { fields.push(`port = $${i++}`);     vals.push(port);     }
    if (username !== undefined) { fields.push(`username = $${i++}`); vals.push(username); }
    if (password !== undefined && password !== "") {
      fields.push(`password = $${i++}`);
      vals.push(password);
    }

    if (fields.length === 0) return reply.code(400).send({ message: "No fields to update" });

    vals.push(req.params.id);
    await req.db.query(
      `UPDATE nvrs SET ${fields.join(", ")} WHERE id = $${i}`,
      vals
    );
    return { message: "NVR updated" };
  });

  fastify.post("/nvrs/:id/delete", async (req, reply) => {
    await req.db.query(`UPDATE cameras SET nvr_id = NULL, channel = NULL WHERE nvr_id = $1`, [req.params.id]);
    await req.db.query(`DELETE FROM nvrs WHERE id = $1`, [req.params.id]);
    return { message: "NVR deleted" };
  });

  // ── NVR Health ──────────────────────────────────────────────────────────────

  // Health check for a specific NVR (tries to reach ip:80 via HTTP HEAD)
  fastify.get("/nvrs/:id/health", async (req) => {
    const rows = await req.db.query(`SELECT brand, ip, port FROM nvrs WHERE id = $1`, [req.params.id]);
    if (!rows?.length) return { status: "not_found" };
    const { ip } = rows[0];
    if (isLocalPlaybackNvr(rows[0])) {
      return fs.existsSync(localPlaybackFile(rows[0]))
        ? { status: "ok", source: "local_file" }
        : { status: "error", source: "local_file", message: "Local playback file not found" };
    }
    const url = `http://${ip}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      return { status: res.ok || res.status < 500 ? "ok" : "error", code: res.status };
    } catch {
      return { status: "error" };
    }
  });

  // ── NVR Stream Profile Audit ───────────────────────────────────────────────

  fastify.get("/nvrs/:id/stream-info", async (req, reply) => {
    const rows = await req.db.query(
      `SELECT id, name, brand, ip, port, username, password FROM nvrs WHERE id = $1`,
      [req.params.id]
    );
    if (!rows?.length) return reply.code(404).send({ message: "NVR not found" });
    try {
      return await readNvrStreamInfo(req.db, rows[0]);
    } catch (err) {
      req.log.warn(err);
      return reply.code(err.statusCode || err.status || 502).send({ message: err.message || "Failed to read NVR stream settings" });
    }
  });

  fastify.post("/nvrs/:id/substream-grid-profile", async (req, reply) => {
    const rows = await req.db.query(
      `SELECT id, name, brand, ip, port, username, password FROM nvrs WHERE id = $1`,
      [req.params.id]
    );
    if (!rows?.length) return reply.code(404).send({ message: "NVR not found" });
    try {
      const result = await applySubstreamGridProfile(req.db, rows[0], req.body || {});
      const info = await readNvrStreamInfo(req.db, rows[0]);
      return { ...result, stream_info: info };
    } catch (err) {
      req.log.warn(err);
      return reply.code(err.statusCode || err.status || 502).send({ message: err.message || "Failed to update NVR substream settings" });
    }
  });

  // ── NVR Alerts ─────────────────────────────────────────────────────────────

  fastify.get("/nvrs/:id/alerts", async (req) => {
    const rows = await req.db.query(
      `SELECT a.id, a.severity, a.message, a.is_read, a.created_at, c.name AS camera_name
       FROM platform_alerts a
       LEFT JOIN cameras c ON c.id = a.camera_id
       WHERE c.nvr_id = $1
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    return { data: rows || [] };
  });

  fastify.post("/nvrs/:id/alerts/read-all", async (req) => {
    await req.db.query(
      `UPDATE platform_alerts SET is_read = true
       WHERE camera_id IN (SELECT id FROM cameras WHERE nvr_id = $1)`,
      [req.params.id]
    );
    return { ok: true };
  });

  // ── Playback: ffmpeg → HLS on disk → hls.js ────────────────────────────────

  fastify.post("/nvr/playback-start", async (req, reply) => {
    const { camera_id, date, start, end } = req.body;
    if (!camera_id || !date || !start || !end) {
      return reply.code(400).send({ message: "camera_id, date, start, end are required" });
    }
    // Accept "HH:MM" or "HH:MM:SS" for start so auto-restart passes second-level precision
    // and avoids hitting the cache for a range already played.
    const startSecs  = parseTimeToSecs(start);
    const endSecs    = parseTimeToSecs(end) ?? (minutesFromTime(end) != null ? minutesFromTime(end) * 60 : null);
    if (!isValidDate(date) || startSecs === null || endSecs === null || startSecs >= endSecs) {
      return reply.code(400).send({ message: "Select a valid date and time range" });
    }

    const range = clampPlaybackRange(date, startSecs, endSecs);
    if (!range.ok) return reply.code(409).send({ message: range.message });

    const rows = await req.db.query(
      `SELECT c.channel, n.id AS nvr_id, n.brand, n.ip, n.port, n.username, n.password
       FROM cameras c JOIN nvrs n ON c.nvr_id = n.id WHERE c.id = $1`,
      [camera_id]
    );
    if (!rows?.length) return reply.code(400).send({ message: "Camera has no NVR configured" });

    const { channel, nvr_id, ...nvr } = rows[0];
    // Cache key uses second-level startSecs — prevents same-minute restart from hitting
    // the same cache entry and replaying the identical clip.
    const cacheKey = `${nvr_id}|${camera_id}|${date}|${range.startSecs}|${range.endSecs}`;

    // Return cached segments (same clip replayed within 30 min).
    const hit = cache.get(cacheKey);
    if (hit?.ready && hasPlayableManifest(path.join(hit.tmpDir, "index.m3u8"))) {
      fastify.log.info(`[nvr] cache hit session=${hit.sessionId}`);
      return {
        session_id: hit.sessionId,
        hls_url: `/api/nvr/playback-hls/${hit.sessionId}/index.m3u8`,
        effective_start: hit.effectiveStart || secsToHHMMSS(range.startSecs),
        effective_end: hit.effectiveEnd || secsToHHMMSS(range.endSecs),
        offset_seconds: hit.offsetSeconds || 0,
        actual_start_secs: hit.actualStartSecs ?? null,
      };
    }
    cache.delete(cacheKey);

    // Teardown any existing playback session on this NVR before opening a new one.
    // CP Plus NVRs have a hard limit on concurrent playback RTSP connections.
    await teardown(nvr_id);

    // Retry several start windows. CP Plus/Dahua often return RTSP 404 when
    // the requested second is not exactly on recorded footage or the end time is in the future.
    const MAX_ATTEMPTS = 3;
    let lastError = null;
    const windows = buildPlaybackWindows(range.startSecs, range.endSecs);

    for (let attempt = 1; attempt <= Math.min(MAX_ATTEMPTS, windows.length); attempt++) {
      const playbackWindow = windows[attempt - 1];
      const localPlayback = isLocalPlaybackNvr(nvr);
      if (localPlayback && !fs.existsSync(localPlaybackFile(nvr))) {
        return reply.code(400).send({ message: `Local playback file not found: ${localPlaybackFile(nvr)}` });
      }
      const rtspUrl = localPlayback ? null : buildPlaybackRtspUrl(nvr, channel || 1, date, playbackWindow.start, playbackWindow.end);
      if (!localPlayback && !rtspUrl) return reply.code(400).send({ message: `Playback not supported for brand: ${nvr.brand}` });
      const windowStartSecs = parseTimeToSecs(playbackWindow.start) ?? range.startSecs;
      const windowEndSecs = parseTimeToSecs(playbackWindow.end) ?? range.endSecs;
      const inputArgs = localPlayback
        ? localInputArgs(nvr, windowStartSecs, windowEndSecs - windowStartSecs)
        : ["-rtsp_transport", "tcp", "-fflags", "+genpts", "-i", rtspUrl];

      const sessionId = randomUUID();
      const tmpDir    = path.join("/tmp", `nvr_pb_${sessionId}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      const ffErrors = [];
      let actualStartSecs = null; // wall-clock secs of the first frame the NVR actually sent

      const ff = spawn("ffmpeg", [
        "-hide_banner",
        "-loglevel",       "warning",
        ...inputArgs,
        "-map",            "0:v:0",
        "-an",
        "-c:v",            "libx264",
        "-preset",         "ultrafast",
        "-tune",           "zerolatency",
        "-crf",            "28",
        "-sc_threshold",   "0",
        "-avoid_negative_ts", "make_zero",
        "-hls_time",       "1",
        "-hls_list_size",  "0",
        "-hls_flags",      "independent_segments",
        "-hls_segment_filename", path.join(tmpDir, "seg_%05d.ts"),
        "-f",              "hls",
        path.join(tmpDir, "index.m3u8"),
      ]);

      activeByNvr.set(nvr_id, { ff, cacheKey, sessionId });
      activeBySession.set(sessionId, nvr_id);
      cache.set(cacheKey, { sessionId, tmpDir, ready: false });

      ff.on("error", (err) => {
        const message = err?.code === "ENOENT"
          ? "ffmpeg is not installed in the backend container"
          : (err?.message || "Failed to start ffmpeg");
        fastify.log.error(`[nvr] ffmpeg spawn failed for session ${sessionId}: ${message}`);
        ffErrors.push(message);
      });

      ff.stderr.on("data", (d) => {
        const line = d.toString().trim();
        fastify.log.debug(`[ffmpeg:${sessionId}] ${sanitizeRtspLog(line)}`);
        ffErrors.push(line);
        // Parse actual stream start from "Duration: N/A, start: 1748212932.000000, ..."
        // This tells us the real wall-clock time of the first frame the NVR sent.
        if (actualStartSecs === null) {
          const m = /\bstart:\s+([\d]+\.?\d*)/.exec(line);
          if (m) {
            const unixTs = parseFloat(m[1]);
            if (unixTs > 86400) { // sanity: must be a real Unix timestamp
              try {
                const p = new Intl.DateTimeFormat("en-CA", {
                  timeZone: NVR_TIMEZONE,
                  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                }).formatToParts(new Date(unixTs * 1000))
                  .reduce((a, x) => { if (x.type !== "literal") a[x.type] = Number(x.value); return a; }, {});
                actualStartSecs = (p.hour || 0) * 3600 + (p.minute || 0) * 60 + (p.second || 0);
              } catch {}
            }
          }
        }
      });
      ff.on("close", (code) => {
        fastify.log.info(`[nvr] session ${sessionId} ended (code=${code})`);
        if (activeByNvr.get(nvr_id)?.sessionId === sessionId) {
          activeByNvr.delete(nvr_id);
          activeBySession.delete(sessionId);
        }
        setTimeout(() => {
          if (cache.get(cacheKey)?.sessionId === sessionId) cache.delete(cacheKey);
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        }, 30 * 60 * 1000);
      });

      try {
        await waitForManifest(path.join(tmpDir, "index.m3u8"), ff, () => ffErrors.at(-1));
        const cached = cache.get(cacheKey);
        if (cached?.sessionId === sessionId) {
          cached.ready          = true;
          cached.effectiveStart = playbackWindow.start;
          cached.effectiveEnd   = playbackWindow.end;
          cached.offsetSeconds  = playbackWindow.offsetSeconds;
          cached.actualStartSecs = actualStartSecs;
        }
        fastify.log.info(`[nvr] playback-start session=${sessionId} nvr=${nvr_id} camera=${camera_id} ${date} ${playbackWindow.start}-${playbackWindow.end} actual_start=${actualStartSecs ?? "unknown"} attempt=${attempt}`);
        return {
          session_id: sessionId,
          hls_url: `/api/nvr/playback-hls/${sessionId}/index.m3u8`,
          effective_start: playbackWindow.start,
          effective_end:   playbackWindow.end,
          offset_seconds:  playbackWindow.offsetSeconds,
          actual_start_secs: localPlayback ? windowStartSecs : actualStartSecs, // real wall-clock secs of first NVR frame
        };
      } catch (err) {
        lastError = ffErrors.at(-1) || err.message;
        fastify.log.warn(`[nvr] attempt ${attempt}/${MAX_ATTEMPTS} failed for ${date} ${playbackWindow.start}-${playbackWindow.end}: ${sanitizeRtspLog(lastError)}`);
        // Kill the failed process and clean up before retrying.
        try { ff.kill("SIGKILL"); } catch (_) {}
        if (activeByNvr.get(nvr_id)?.sessionId === sessionId) {
          activeByNvr.delete(nvr_id); activeBySession.delete(sessionId);
        }
        cache.delete(cacheKey);
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

        if (attempt < MAX_ATTEMPTS) {
          // Wait for NVR to release the RTSP slot before retrying.
          fastify.log.info(`[nvr] waiting before retry ${attempt + 1}…`);
          await new Promise(r => setTimeout(r, Number(process.env.NVR_RETRY_GRACE_MS || 700)));
        }
      }
    }

    return reply.code(502).send({ message: toClientPlaybackError(lastError) });
  });

  fastify.post("/nvr/playback-stop", async (req, reply) => {
    const { session_id } = req.body;
    const nvrId = session_id ? activeBySession.get(session_id) : null;
    if (nvrId) await teardown(nvrId, session_id);
    return { message: "ok" };
  });

  // ── Download clip as MP4 ───────────────────────────────────────────────────

  fastify.get("/nvr/download", async (req, reply) => {
    const { camera_id, date, start, end } = req.query;
    if (!camera_id || !date || !start || !end) {
      return reply.code(400).send({ message: "camera_id, date, start, end are required" });
    }
    const startSecs = parseTimeToSecs(start);
    const endSecs   = parseTimeToSecs(end);
    if (!isValidDate(date) || startSecs === null || endSecs === null || startSecs >= endSecs) {
      return reply.code(400).send({ message: "Invalid date or time range" });
    }

    const range = clampPlaybackRange(date, startSecs, endSecs);
    if (!range.ok) return reply.code(409).send({ message: range.message });

    const rows = await req.db.query(
      `SELECT c.channel, n.brand, n.ip, n.port, n.username, n.password
       FROM cameras c JOIN nvrs n ON c.nvr_id = n.id WHERE c.id = $1`,
      [camera_id]
    );
    if (!rows?.length) return reply.code(400).send({ message: "Camera not found or has no NVR" });

    const { channel, ...nvr } = rows[0];
    const localPlayback = isLocalPlaybackNvr(nvr);
    if (localPlayback && !fs.existsSync(localPlaybackFile(nvr))) {
      return reply.code(400).send({ message: `Local playback file not found: ${localPlaybackFile(nvr)}` });
    }
    const rtspUrl = localPlayback
      ? null
      : buildPlaybackRtspUrl(
          nvr,
          channel || 1,
          date,
          secsToHHMMSS(range.startSecs),
          secsToHHMMSS(range.endSecs)
        );
    if (!localPlayback && !rtspUrl) return reply.code(400).send({ message: `Playback not supported for brand: ${nvr.brand}` });
    const inputArgs = localPlayback
      ? localInputArgs(nvr, range.startSecs, range.endSecs - range.startSecs)
      : ["-rtsp_transport", "tcp", "-fflags", "+genpts", "-i", rtspUrl];

    const filename = `cam${camera_id}_${date}_${start.replace(":", "")}-${end.replace(":", "")}.mp4`;

    reply.raw.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    reply.raw.setHeader("Content-Type", "video/mp4");
    reply.raw.setHeader("Cache-Control", "no-store");
    reply.hijack();

    const ff = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",        "warning",
      ...inputArgs,
      "-map",             "0:v:0",
      "-an",
      "-c:v",             "libx264",
      "-preset",          "ultrafast",
      "-tune",            "zerolatency",
      "-crf",             "28",
      "-avoid_negative_ts", "make_zero",
      "-movflags",        "frag_keyframe+empty_moov",
      "-f",               "mp4",
      "pipe:1",
    ]);

    req.raw.on("close", () => { try { ff.kill("SIGTERM"); } catch (_) {} });
    ff.on("error", (err) => {
      fastify.log.error(`[dl:${camera_id}] ffmpeg spawn failed: ${err?.message || err}`);
      if (!reply.raw.writableEnded) reply.raw.end();
    });
    ff.stdout.pipe(reply.raw);
    ff.stderr.on("data", (d) => fastify.log.debug(`[dl:${camera_id}] ${d.toString().trim()}`));
    ff.on("close", () => { if (!reply.raw.writableEnded) reply.raw.end(); });
  });

  // ── Cameras with NVR list (for playback page dropdown) ─────────────────────

  fastify.get("/nvr/cameras", async (req) => {
    const rows = await req.db.query(
      `SELECT c.id, c.name, c.channel, n.id AS nvr_id, n.name AS nvr_name, n.brand
       FROM cameras c
       JOIN nvrs n ON c.nvr_id = n.id
       WHERE c.status = 'Active'
       ORDER BY n.name, c.name`
    );
    return { data: rows || [] };
  });

  // ── Stream debug: resolved AI + live URLs per camera (password masked) ────────
  // Shows exactly what URL the AI process and live view will connect to.

  fastify.get("/nvr/stream-debug", async (req) => {
    const rows = await req.db.query(
      `SELECT c.id, c.name, c.url, c.url2, c.channel,
              COALESCE(c.ai_stream, 'main')       AS ai_stream,
              COALESCE(c.live_view_stream, 'sub') AS live_stream,
              c.status,
              n.brand, n.ip, n.port, n.username, n.password AS nvr_password, n.name AS nvr_name
       FROM cameras c
       LEFT JOIN nvrs n ON c.nvr_id = n.id
       ORDER BY c.name`
    );

    const maskPassword = (url) => {
      if (!url) return null;
      return url.replace(/(:\/\/)([^:@]+):([^@]+)@/, (_, sep, user, _pass) => `${sep}${user}:***@`);
    };

    const buildNvr = (row) => row.brand ? {
      brand: row.brand, ip: row.ip, port: row.port,
      username: row.username, password: row.nvr_password,
    } : null;

    const data = (rows || []).map((row) => {
      const cam = { url: row.url, url2: row.url2, channel: row.channel };
      const nvr = buildNvr(row);
      const aiUrl   = buildLiveRtspUrl(cam, nvr, row.ai_stream);
      const liveUrl = buildLiveRtspUrl(cam, nvr, row.live_stream);
      return {
        id:          row.id,
        name:        row.name,
        status:      row.status,
        has_nvr:     !!nvr,
        nvr_name:    row.nvr_name || null,
        nvr_brand:   row.brand || null,
        channel:     row.channel || null,
        ai_stream:   row.ai_stream,
        live_stream: row.live_stream,
        url:         row.url,
        url2:        row.url2,
        ai_url:      maskPassword(aiUrl),
        live_url:    maskPassword(liveUrl),
      };
    });

    return { data };
  });
}
