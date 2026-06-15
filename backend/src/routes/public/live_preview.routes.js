import { LivePreviewController } from "../../controllers/live_preview.controller.js";

export default async function livePreviewRoutes(fastify, opts) {
    fastify.get("/live-preview/stream/:sessionId", LivePreviewController.stream);

    fastify.get("/ai-detections/:cameraId", async (req, reply) => {
        const { cameraId } = req.params;
        try {
            const upstream = await fetch(`${process.env.AI_URL}/ai-detections/${cameraId}`);
            const data = await upstream.json();
            return reply.header("Cache-Control", "no-store").send(data);
        } catch {
            return reply.send({ ts: 0, w: 640, h: 360, persons: [], fire: [] });
        }
    });

    fastify.get("/ai-stream/:cameraId", async (req, reply) => {
        const { cameraId } = req.params;
        let upstream;
        try {
            upstream = await fetch(`${process.env.AI_URL}/ai-stream/${cameraId}`);
        } catch {
            return reply.code(502).send({ message: "AI service unreachable" });
        }
        if (!upstream.ok || !upstream.body) {
            return reply.code(502).send({ message: "AI stream unavailable" });
        }
        reply.hijack();
        reply.raw.statusCode = 200;
        reply.raw.setHeader("Content-Type", "multipart/x-mixed-replace; boundary=frame");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Access-Control-Allow-Origin", "*");
        const { Readable } = await import("node:stream");
        const nodeStream = Readable.fromWeb(upstream.body);
        req.raw.on("close", () => nodeStream.destroy());
        nodeStream.pipe(reply.raw);
    });
}