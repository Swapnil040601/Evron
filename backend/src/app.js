import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import dbPlugin from "./plugins/db.plugin.js";
import fastifyJwt from "@fastify/jwt";
import AutoLoad from "@fastify/autoload";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { AlertsService } from "./services/alerts.service.js";
import { registerAllCameraStreams } from "./services/live_preview.service.js";
import { startNvrEventService } from "./services/nvrEventService.js";

function resolveFilesRoot() {
  const configuredRoot = process.env.FILES_ROOT;

  if (configuredRoot && fs.existsSync(configuredRoot)) {
    return configuredRoot;
  }

  return "/app/files";
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";

  return "application/octet-stream";
}

function resolveExistingFile(filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const match = basename.match(/^(.*)-\d+$/);

  if (!match || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return null;
  }

  const prefix = `${match[1]}-`;
  const candidates = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(ext))
    .map((name) => path.join(dir, name))
    .filter((candidate) => fs.statSync(candidate).isFile())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  return candidates[0] || null;
}

function registerFileRoutes(fastify) {
  const filesRoot = path.resolve(resolveFilesRoot());

  fastify.route({
    method: ["GET", "HEAD"],
    url: "/file/*",
    handler: async (request, reply) => {
      const rawPath = request.params["*"] || "";
      const safePath = decodeURIComponent(rawPath);
      const filePath = path.resolve(filesRoot, safePath);

      if (filePath !== filesRoot && !filePath.startsWith(`${filesRoot}${path.sep}`)) {
        return reply.code(400).send({ message: "Invalid file path" });
      }

      const existingPath = resolveExistingFile(filePath);

      if (!existingPath) {
        return reply.code(404).send({ message: "File not found" });
      }

      const stat = fs.statSync(existingPath);
      reply
        .type(getContentType(existingPath))
        .header("Content-Length", stat.size)
        .header("Cache-Control", "public, max-age=3600");

      if (request.method === "HEAD") {
        return reply.send();
      }

      return reply.send(fs.createReadStream(existingPath));
    },
  });
}

async function buildApp() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: Number(process.env.BODY_LIMIT_BYTES || 25 * 1024 * 1024),
  });

  // Load env locally
  if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv");
    dotenv.config();
  }

  // 3. Register multipart (file uploads)
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // 4. Register CORS
  await fastify.register(cors, {
    origin: ["*"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Act"],
    credentials: true,
  });

  // 4. Register JWT
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  // 5. Decorators
  fastify.decorate("authenticate", async function (request, reply) {
    try {

      const decoded = await request.jwtVerify();
      request.user = decoded;
    } catch (err) {
      reply.send(err);
    }
  });


  // Register Plugin
  fastify.register(dbPlugin);

  // 6. AutoLoad Routes
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // 1️⃣ Public routes (NO auth)
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes/public"),
  });
  registerFileRoutes(fastify);

  // 2️⃣ Protected routes (Auth required)
  fastify.register(async function (instance) {
    instance.addHook("onRequest", instance.authenticate);

    instance.register(AutoLoad, {
      dir: path.join(__dirname, "routes/protected"),
    });
  });

  return fastify;
}

const app = await buildApp();

app.ready().then(() => {
  // Large NVR deployments should keep live streams on-demand. Bulk MediaMTX
  // registration is available only when explicitly enabled for small sites.
  if (process.env.LIVEVIEW_REGISTER_ALL_STREAMS === "true") {
    const syncStreams = () =>
      registerAllCameraStreams(app.dataSource).catch((e) =>
        console.error("[mediamtx] sync error:", e.message)
      );
    setTimeout(syncStreams, 5000);
    setInterval(syncStreams, 2 * 60 * 1000);
  }

  // Start NVR event polling (motion, video loss, tampering, disk, etc.)
  startNvrEventService(app.dataSource, app.log);

  // Schedule attendance alert generation every 15 minutes
  const run = () =>
    AlertsService.generateAttendanceAlerts(app.dataSource).catch((e) =>
      console.error("[alerts] generation error:", e.message)
    );
  run();
  setInterval(run, 15 * 60 * 1000);
});

export default app;
