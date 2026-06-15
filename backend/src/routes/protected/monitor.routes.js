import os from "os";
import { execSync } from "child_process";
import fs from "fs";

const MEDIAMTX_API = process.env.MEDIAMTX_API_URL || "http://mediamtx:9997";
const AI_STATS_FILE = process.env.AI_STATS_FILE || "/app/files/monitor_stats.json";
const AI_URL = process.env.AI_URL || "http://ai-api:5001";

function getStorageStats() {
  try {
    // -Pk: POSIX format, 1K-block units — works on BusyBox (Alpine) and GNU coreutils
    // Columns: Filesystem 1K-blocks Used Available Use% Mounted
    const raw = execSync("df -Pk / /app/files /tmp 2>/dev/null || df -Pk /", { timeout: 5000 }).toString();
    const seen = new Set();
    return raw.trim().split("\n").slice(1).map(line => {
      const parts = line.trim().split(/\s+/);
      const [filesystem, total, used, avail, usePct, mount] = parts;
      if (seen.has(filesystem)) return null;
      seen.add(filesystem);
      return {
        mount,
        filesystem,
        total_bytes: (parseInt(total) || 0) * 1024,
        used_bytes:  (parseInt(used)  || 0) * 1024,
        free_bytes:  (parseInt(avail) || 0) * 1024,
        use_pct:     parseInt(usePct) || 0,
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function getAiStats() {
  try {
    if (!fs.existsSync(AI_STATS_FILE)) return null;
    return JSON.parse(fs.readFileSync(AI_STATS_FILE, "utf8"));
  } catch {
    return null;
  }
}

async function getFaceRegistrationStatus() {
  try {
    const res = await fetch(`${AI_URL}/face-registration/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return {
        ready: false,
        loading: false,
        error: `AI API returned ${res.status}`,
      };
    }
    return await res.json();
  } catch (err) {
    return {
      ready: false,
      loading: false,
      error: err?.message || "AI API is not reachable",
    };
  }
}

async function getSystemStats() {
  const cpus      = os.cpus();
  const loadAvg   = os.loadavg();
  const totalMem  = os.totalmem();
  const freeMem   = os.freemem();
  const usedMem   = totalMem - freeMem;
  const cpuPct    = Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100));
  const memPct    = Math.round((usedMem / totalMem) * 100);
  return {
    cpu_pct:      cpuPct,
    cpu_cores:    cpus.length,
    load_avg_1m:  Math.round(loadAvg[0] * 100) / 100,
    mem_used_mb:  Math.round(usedMem / 1024 / 1024),
    mem_total_mb: Math.round(totalMem / 1024 / 1024),
    mem_pct:      memPct,
    uptime_s:     Math.round(os.uptime()),
  };
}

async function getMediamtxPaths() {
  try {
    const res = await fetch(`${MEDIAMTX_API}/v3/paths/list`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

async function checkNvrOnline(ip) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`http://${ip}`, { method: "HEAD", signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

function checkNvrRowOnline(nvr) {
  if (String(nvr?.brand || "").toLowerCase() === "local") {
    return fs.existsSync(String(nvr.ip || ""));
  }
  return checkNvrOnline(nvr.ip);
}

export default async function monitorRoutes(fastify) {
  fastify.get("/monitor/stats", async (req) => {
    const storage = getStorageStats();
    const [systemStats, paths, nvrs, faceRegistrationStatus] = await Promise.all([
      getSystemStats(),
      getMediamtxPaths(),
      req.db.query(`
        SELECT n.id, n.name, n.brand, n.ip, n.port,
               COUNT(c.id) AS camera_count
        FROM nvrs n
        LEFT JOIN cameras c ON c.nvr_id = n.id AND c.status = 'Active'
        GROUP BY n.id, n.name, n.brand, n.ip, n.port
        ORDER BY n.id
      `),
      getFaceRegistrationStatus(),
    ]);
    const aiStats = getAiStats();

    let totalInBytes = 0, totalOutBytes = 0, activeStreams = 0;
    for (const p of paths) {
      totalInBytes  += p.bytesReceived || p.inboundBytes  || 0;
      totalOutBytes += p.bytesSent     || p.outboundBytes || 0;
      if (p.ready) activeStreams++;
    }

    const nvrList = await Promise.all((nvrs || []).map(async (nvr) => {
      const online = await checkNvrRowOnline(nvr);
      const nvrCamPaths = paths.filter(p => /^cam_(\d+)$/.test(p.name));
      const nvrInBytes  = nvrCamPaths.reduce((s, p) => s + (p.bytesReceived || p.inboundBytes  || 0), 0);
      const nvrOutBytes = nvrCamPaths.reduce((s, p) => s + (p.bytesSent     || p.outboundBytes || 0), 0);
      const nvrActive   = nvrCamPaths.filter(p => p.ready).length;

      return {
        id:             nvr.id,
        name:           nvr.name,
        brand:          nvr.brand,
        ip:             nvr.ip,
        port:           nvr.port,
        camera_count:   parseInt(nvr.camera_count) || 0,
        online,
        active_streams: nvrActive,
        bytes_in:       nvrInBytes,
        bytes_out:      nvrOutBytes,
      };
    }));

    return {
      system:  systemStats,
      storage,
      nvrs:    nvrList,
      streams: {
        total:     paths.length,
        active:    activeStreams,
        bytes_in:  totalInBytes,
        bytes_out: totalOutBytes,
      },
      ai: {
        ...(aiStats || {}),
        face_registration: faceRegistrationStatus,
      },
    };
  });

  fastify.post("/monitor/events/clear", async () => {
    return { ok: true };
  });
}
