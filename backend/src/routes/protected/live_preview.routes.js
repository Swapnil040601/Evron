import { LivePreviewController } from "../../controllers/live_preview.controller.js";

export default async function livePreviewRoutes(fastify, opts) {
    fastify.post("/live-preview/start", LivePreviewController.start);
    fastify.post("/live-preview/stop", LivePreviewController.stop);
    fastify.post("/live-preview/hls-start", LivePreviewController.hlsStart);
}