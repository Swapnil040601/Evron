import { Readable } from "node:stream";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { resolveCameraRtspUrl, buildLiveRtspUrl } from "../utils/rtsp.js";

const AI_URL = process.env.AI_URL;

function buildAiUrl(path) {
  if (!AI_URL) {
    const err = new Error("AI_URL is not configured");
    err.statusCode = 500;
    throw err;
  }

  return `${AI_URL}${path}`;
}

const MEDIAMTX_API = process.env.MEDIAMTX_API_URL || "http://mediamtx:9997";
const MEDIAMTX_RTSP_URL = process.env.MEDIAMTX_RTSP_URL || "rtsp://mediamtx:8554";
const MEDIAMTX_HLS_URL = process.env.MEDIAMTX_HLS_URL || "http://mediamtx:8888";
const TRANSCODE_MAIN_STREAM = String(process.env.LIVE_PREVIEW_TRANSCODE_MAIN || "true").toLowerCase() !== "false";
const TRANSCODE_IDLE_MS = Math.max(60_000, Number(process.env.LIVE_PREVIEW_TRANSCODE_IDLE_MS || 15 * 60_000));
const localVideoPublishers = new Map();
const mainStreamTranscoders = new Map();

function mediaMtxStreamName(cameraId, streamType = "sub") {
  const quality = ["main", "sub", "sub2"].includes(streamType) ? streamType : "sub";
  return `cam_${cameraId}_${quality}`;
}

function isLocalVideoSource(source) {
  const value = String(source || "").trim();
  return value.startsWith("/") || value.startsWith("file://");
}

function localVideoPath(source) {
  const value = String(source || "").trim();
  return value.startsWith("file://") ? new URL(value).pathname : value;
}

function stopProcess(proc) {
  if (!proc || proc.exitCode !== null) return;
  try { proc.kill("SIGTERM"); } catch (_) {}
}

async function upsertMediaMtxPath(streamName, pathConfig) {
  const body = JSON.stringify(pathConfig);
  const headers = { "Content-Type": "application/json" };

  const existing = await fetch(`${MEDIAMTX_API}/v3/config/paths/get/${streamName}`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);

  if (
    existing &&
    existing.source === pathConfig.source &&
    Boolean(existing.sourceOnDemand) === Boolean(pathConfig.sourceOnDemand) &&
    (existing.rtspTransport || "automatic") === (pathConfig.rtspTransport || "automatic")
  ) {
    return;
  }

  let res = await fetch(`${MEDIAMTX_API}/v3/config/paths/patch/${streamName}`, {
    method: "PATCH", headers, body,
  });

  if (!res.ok) {
    const patchText = await res.text().catch(() => "");
    res = await fetch(`${MEDIAMTX_API}/v3/config/paths/add/${streamName}`, {
      method: "POST", headers, body,
    });

    if (!res.ok) {
      const addText = await res.text().catch(() => "");
      const err = new Error(addText || patchText || "Failed to register stream with MediaMTX");
      err.statusCode = 502;
      throw err;
    }
  }
}

async function registerStreamWithMediaMTX(streamName, rtspUrl) {
  await upsertMediaMtxPath(streamName, { source: rtspUrl, sourceOnDemand: false, rtspTransport: "tcp" });
  return true;
}

async function ensureLocalVideoPublisher(streamName, source) {
  const filePath = localVideoPath(source);
  if (!fs.existsSync(filePath)) {
    const err = new Error(`Local video file not found: ${filePath}`);
    err.statusCode = 400;
    throw err;
  }

  await upsertMediaMtxPath(streamName, { source: "publisher", sourceOnDemand: false });

  const existing = localVideoPublishers.get(streamName);
  if (existing?.filePath === filePath && existing.ff && existing.ff.exitCode === null) {
    return true;
  }

  if (existing?.ff && existing.ff.exitCode === null) {
    stopProcess(existing.ff);
  }

  const publishUrl = `${MEDIAMTX_RTSP_URL}/${streamName}`;
  const ff = spawn("ffmpeg", [
    "-hide_banner",
    "-loglevel", "warning",
    "-re",
    "-stream_loop", "-1",
    "-i", filePath,
    "-map", "0:v:0",
    "-an",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "zerolatency",
    "-pix_fmt", "yuv420p",
    "-f", "rtsp",
    "-rtsp_transport", "tcp",
    publishUrl,
  ]);

  ff.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.warn(`[live-preview] local video ${streamName}: ${text}`);
  });

  ff.on("close", (code) => {
    const current = localVideoPublishers.get(streamName);
    if (current?.ff === ff) {
      localVideoPublishers.delete(streamName);
    }
    console.warn(`[live-preview] local video publisher stopped ${streamName} code=${code}`);
  });

  localVideoPublishers.set(streamName, { ff, filePath });
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (ff.exitCode !== null) {
    const err = new Error("Failed to start local video live publisher");
    err.statusCode = 502;
    throw err;
  }
  return true;
}

async function waitForHlsReady(streamName, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  const url = `${MEDIAMTX_HLS_URL}/${streamName}/index.m3u8`;

  while (Date.now() < deadline) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const text = await res.text().catch(() => "");
      if (res.ok && text.includes("#EXTM3U")) return true;
    } catch (_) {
      // The muxer may not exist yet while ffmpeg/MediaMTX are warming up.
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const err = new Error("Timed out waiting for high stream HLS to become ready");
  err.statusCode = 504;
  throw err;
}

async function ensureMainTranscoder(streamName, rtspUrl) {
  await upsertMediaMtxPath(streamName, { source: "publisher", sourceOnDemand: false });

  const existing = mainStreamTranscoders.get(streamName);
  if (existing?.rtspUrl === rtspUrl && existing.ff && existing.ff.exitCode === null) {
    clearTimeout(existing.idleTimer);
    existing.idleTimer = setTimeout(() => stopProcess(existing.ff), TRANSCODE_IDLE_MS);
    return true;
  }

  if (existing?.ff && existing.ff.exitCode === null) {
    stopProcess(existing.ff);
  }

  const publishUrl = `${MEDIAMTX_RTSP_URL}/${streamName}`;
  const ff = spawn("ffmpeg", [
    "-hide_banner",
    "-loglevel", "warning",
    "-rtsp_transport", "tcp",
    "-i", rtspUrl,
    "-map", "0:v:0",
    "-an",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-pix_fmt", "yuv420p",
    "-f", "rtsp",
    "-rtsp_transport", "tcp",
    publishUrl,
  ]);

  ff.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.warn(`[live-preview] main transcode ${streamName}: ${text}`);
  });

  ff.on("close", (code) => {
    const current = mainStreamTranscoders.get(streamName);
    if (current?.ff === ff) {
      clearTimeout(current.idleTimer);
      mainStreamTranscoders.delete(streamName);
    }
    console.warn(`[live-preview] main transcoder stopped ${streamName} code=${code}`);
  });

  const idleTimer = setTimeout(() => stopProcess(ff), TRANSCODE_IDLE_MS);
  mainStreamTranscoders.set(streamName, { ff, rtspUrl, idleTimer });

  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (ff.exitCode !== null) {
    const err = new Error("Failed to start main stream transcoder");
    err.statusCode = 502;
    throw err;
  }
  return true;
}

const LivePreviewService = {
  async hlsStart({ camera_id, camera_url, stream_type }, db) {
    // If no direct URL provided, resolve RTSP from the camera's NVR config
    let resolvedUrl = camera_url;
    if (!resolvedUrl && camera_id && db) {
      resolvedUrl = await resolveCameraRtspUrl(db, camera_id, stream_type || null);
    }

    if (!resolvedUrl) {
      const err = new Error("camera_url is required (or camera must be linked to an NVR)");
      err.statusCode = 400;
      throw err;
    }

    // If the camera is already a MediaMTX-hosted stream, extract the path directly
    const mediamtxLocal = /mediamtx:\d+\/(.+)/.exec(resolvedUrl);
    if (mediamtxLocal) {
      const pathName = mediamtxLocal[1];
      return {
        hls_url: `/hls/${pathName}/index.m3u8`,
        webrtc_url: `/webrtc/${pathName}/whep`,
        stream_name: pathName,
      };
    }

    const effectiveStreamType = stream_type || "sub";
    const streamName = mediaMtxStreamName(camera_id, effectiveStreamType);
    if (isLocalVideoSource(resolvedUrl)) {
      await ensureLocalVideoPublisher(streamName, resolvedUrl);
      return {
        hls_url: `/hls/${streamName}/index.m3u8`,
        webrtc_url: `/webrtc/${streamName}/whep`,
        stream_name: streamName,
        stream_type: effectiveStreamType,
      };
    }

    if (TRANSCODE_MAIN_STREAM && effectiveStreamType === "main") {
      const transcodedStreamName = `${streamName}_h264`;
      await ensureMainTranscoder(transcodedStreamName, resolvedUrl);
      await waitForHlsReady(transcodedStreamName);
      return {
        hls_url: `/hls/${transcodedStreamName}/index.m3u8`,
        webrtc_url: `/webrtc/${transcodedStreamName}/whep`,
        stream_name: transcodedStreamName,
        stream_type: effectiveStreamType,
        transcoded: true,
      };
    }

    const pathConfig = { source: resolvedUrl, sourceOnDemand: true, rtspTransport: "tcp" };

    await upsertMediaMtxPath(streamName, pathConfig);

    return {
      hls_url: `/hls/${streamName}/index.m3u8`,
      webrtc_url: `/webrtc/${streamName}/whep`,
      stream_name: streamName,
      stream_type: effectiveStreamType,
    };
  },


  async start(payload = {}, db = null) {
    // If camera_id provided, resolve RTSP URL from NVR config
    if (payload.camera_id && db) {
      const rtspUrl = await resolveCameraRtspUrl(db, payload.camera_id, "sub");
      if (!rtspUrl) {
        const err = new Error("Camera not found or has no RTSP URL configured");
        err.statusCode = 400;
        throw err;
      }
      payload = { source: { type: "rtsp", value: rtspUrl } };
    }

    const response = await fetch(buildAiUrl("/live-preview/start"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.message || "AI service failed to start preview");
      err.statusCode = response.status;
      throw err;
    }

    return {
      ...data,
      stream_url: data?.session_id
        ? `/live-preview/stream/${data.session_id}`
        : null,
    };
  },

  async stop(payload = {}) {
    const response = await fetch(buildAiUrl("/live-preview/stop"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.message || "AI service failed to stop preview");
      err.statusCode = response.status;
      throw err;
    }

    return data;
  },

  async stream(request, reply) {
    const { sessionId } = request.params;

    if (!sessionId) {
      const err = new Error("sessionId is required");
      err.statusCode = 400;
      throw err;
    }

    const response = await fetch(
      buildAiUrl(`/live-preview/stream/${encodeURIComponent(sessionId)}`)
    );

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      const err = new Error(text || "AI stream not available");
      err.statusCode = response.status || 502;
      throw err;
    }

    const contentType =
      response.headers.get("content-type") ||
      "multipart/x-mixed-replace; boundary=frame";

    reply.hijack();
    reply.raw.statusCode = 200;
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    reply.raw.setHeader("Content-Type", contentType);
    reply.raw.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    reply.raw.setHeader("Pragma", "no-cache");
    reply.raw.setHeader("Expires", "0");
    reply.raw.setHeader("Connection", "keep-alive");

    const nodeStream = Readable.fromWeb(response.body);

    nodeStream.on("error", (error) => {
      request.log.error(error, "Error while proxying MJPEG stream");
      if (!reply.raw.destroyed) {
        reply.raw.destroy(error);
      }
    });

    request.raw.on("close", () => {
      if (!nodeStream.destroyed) {
        nodeStream.destroy();
      }
    });

    nodeStream.pipe(reply.raw);
  },
};

// Register all active cameras as always-on streams in MediaMTX.
// Called at startup and can be called again when cameras change.
export async function registerAllCameraStreams(db) {
  let rows;
  try {
    rows = await db.query(
      `SELECT c.id, c.url, c.url2, c.channel, c.live_view_stream,
              n.brand, n.ip, n.port, n.username, n.password AS nvr_password
       FROM cameras c
       LEFT JOIN nvrs n ON c.nvr_id = n.id
       WHERE c.status = 'Active'`
    );
  } catch (e) {
    console.error("[mediamtx] failed to query cameras:", e.message);
    return;
  }

  for (const cam of rows) {
    const nvr = cam.brand
      ? { brand: cam.brand, ip: cam.ip, port: cam.port, username: cam.username, password: cam.nvr_password }
      : null;
    const streamType = cam.live_view_stream || "sub";
    const rtspUrl = buildLiveRtspUrl(cam, nvr, streamType);
    if (!rtspUrl) continue;

    const streamName = mediaMtxStreamName(cam.id, streamType);
    if (isLocalVideoSource(rtspUrl)) {
      // Local file sources are started on-demand via ensureLocalVideoPublisher in hlsStart
      console.log(`[mediamtx] ${streamName} → skipped (local file, started on demand)`);
      continue;
    }
    const ok = await registerStreamWithMediaMTX(streamName, rtspUrl).catch(() => false);
    console.log(`[mediamtx] ${streamName} → ${ok ? "registered" : "failed"} (${streamType})`);
  }
}

export default LivePreviewService;
