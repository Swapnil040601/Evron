import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || "/app/files";

export default async function updatesRoutes(fastify, opts) {
  // Called by @capgo/capacitor-updater on every app launch
  // Headers sent: cap_version_name (current app version), cap_app_id
  fastify.get("/updates/latest", async (req, reply) => {
    try {
      const versionFile = path.join(FILES_ROOT, "updates", "version.txt");

      if (!fs.existsSync(versionFile)) {
        // No update deployed yet — tell updater to do nothing
        return reply.code(200).send({});
      }

      const latestVersion = fs.readFileSync(versionFile, "utf8").trim();
      const appVersion = req.headers["cap_version_name"] || req.headers["cap-version-name"] || "0.0.0";

      // Same version → no update
      if (appVersion === latestVersion) {
        return reply.code(200).send({});
      }

      const bundleName = `bundle-${latestVersion}.zip`;
      const bundlePath = path.join(FILES_ROOT, "updates", bundleName);

      if (!fs.existsSync(bundlePath)) {
        return reply.code(200).send({});
      }

      const baseUrl = `${req.protocol}://${req.hostname}`;
      const port = req.socket.localPort;
      const serverBase = port && port !== 80 && port !== 443 ? `${baseUrl}:${port}` : baseUrl;

      return {
        version: latestVersion,
        url: `${serverBase}/api/file/updates/${bundleName}`,
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(200).send({});
    }
  });
}
