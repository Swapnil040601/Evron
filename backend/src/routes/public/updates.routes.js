import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || "/app/files";
// Public URL that the mobile app can reach (set via PUBLIC_BASE_URL env or fallback to GCP IP)
const PUBLIC_BASE = (process.env.PUBLIC_BASE_URL || "http://35.244.3.148:5193").replace(/\/$/, "");

export default async function updatesRoutes(fastify, opts) {
  fastify.get("/updates/latest", async (req, reply) => {
    try {
      const versionFile = path.join(FILES_ROOT, "updates", "version.txt");

      if (!fs.existsSync(versionFile)) {
        return reply.code(200).send({});
      }

      const latestVersion = fs.readFileSync(versionFile, "utf8").trim();
      const appVersion = req.headers["cap_version_name"] || req.headers["cap-version-name"] || "0.0.0";

      if (appVersion === latestVersion) {
        return reply.code(200).send({});
      }

      const bundleName = `bundle-${latestVersion}.zip`;
      const bundlePath = path.join(FILES_ROOT, "updates", bundleName);

      if (!fs.existsSync(bundlePath)) {
        return reply.code(200).send({});
      }

      return {
        version: latestVersion,
        url: `${PUBLIC_BASE}/api/file/updates/${bundleName}`,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(200).send({});
    }
  });
}
