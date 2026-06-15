import http from "http";

function dockerRestart(containerName) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: "/var/run/docker.sock",
        path: `/v1.41/containers/${containerName}/restart`,
        method: "POST",
      },
      (res) => {
        res.resume();
        if (res.statusCode === 204) resolve({ restarted: true });
        else reject(new Error(`Docker API ${res.statusCode}`));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export default async function adminRoutes(fastify) {
  fastify.post("/admin/restart-backend", async (req, reply) => {
    const aiContainer = process.env.AI_CONTAINER_NAME || "ai";
    const backendContainer = process.env.BACKEND_CONTAINER_NAME || "fastify_backend";

    try {
      // Restart AI first so it re-reads camera configs from DB. Backend restart
      // is scheduled after the response so the client receives the reply.
      await dockerRestart(aiContainer);

      setTimeout(async () => {
        try {
          await dockerRestart(backendContainer);
        } catch (e) {
          fastify.log.error({ err: e, backendContainer }, "Backend restart failed");
        }
      }, 500);

      return {
        ok: true,
        message: `AI restarted. Backend restart scheduled for ${backendContainer}.`,
      };
    } catch (e) {
      reply.code(500);
      return { ok: false, message: e.message };
    }
  });
}
