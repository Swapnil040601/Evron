import fs from "fs";
import path from "path";

// Serves HLS segments for NVR playback sessions.
// Security: the session UUID is unguessable — no JWT needed per segment.
export default async function nvrPlaybackHlsRoutes(fastify) {
  fastify.get("/nvr/playback-hls/:sessionId/:file", async (req, reply) => {
    const { sessionId, file } = req.params;

    // Block path traversal
    if (/[/\\]/.test(sessionId) || /[/\\]/.test(file)) {
      return reply.code(400).send({ message: "Invalid path" });
    }

    const filePath = path.join("/tmp", `nvr_pb_${sessionId}`, file);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ message: "Segment not found" });
    }

    const ext = path.extname(file);
    const contentType =
      ext === ".m3u8" ? "application/vnd.apple.mpegurl" :
      ext === ".ts"   ? "video/mp2t" : "application/octet-stream";

    return reply
      .header("Content-Type", contentType)
      .header("Cache-Control", "no-cache")
      .send(fs.createReadStream(filePath));
  });
}
