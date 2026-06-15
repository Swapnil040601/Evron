const PLAYGROUND_MODELS = [
  {
    id: "face",
    name: "Face Recognition",
    description: "Detect faces and compare them with registered employee faces.",
  },
  {
    id: "people_phone",
    name: "People and Mobile Detection",
    description: "Detect people, mobile phones and usage signals.",
  },
  {
    id: "fire",
    name: "Fire and Smoke Detection",
    description: "Run the configured fire/smoke YOLO model.",
  },
  {
    id: "license_plate",
    name: "License Plate Detection",
    description: "Detect vehicle license-plate regions for Vehicle Access Control.",
  },
];

async function forwardToAi(path, payload) {
  const aiUrl = process.env.AI_URL;
  if (!aiUrl) {
    throw new Error("AI_URL is not configured");
  }

  const response = await fetch(`${aiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || "AI service request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

export default async function aiPlaygroundRoutes(fastify) {
  fastify.get("/ai-playground/models", async (_req, reply) => {
    try {
      const aiUrl = process.env.AI_URL;
      if (!aiUrl) return { success: true, data: PLAYGROUND_MODELS };

      const upstream = await fetch(`${aiUrl}/playground/models`);
      if (!upstream.ok) return { success: true, data: PLAYGROUND_MODELS };

      const data = await upstream.json();
      return data?.data ? data : { success: true, data: PLAYGROUND_MODELS };
    } catch {
      return { success: true, data: PLAYGROUND_MODELS };
    }
  });

  fastify.post(
    "/ai-playground/analyze",
    { bodyLimit: 12 * 1024 * 1024 },
    async (req, reply) => {
      try {
        return await forwardToAi("/playground/analyze", req.body || {});
      } catch (error) {
        return reply.code(error.statusCode || 502).send({
          success: false,
          message: error.message || "AI service unreachable",
        });
      }
    }
  );
}
