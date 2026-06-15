import fp from "fastify-plugin";
import { DataSource } from "typeorm";

let dataSource; // 🔑 GLOBAL SINGLETON

async function initDataSource() {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ["src/entities/*.js"],
    migrations: ["src/migrations/*.js"],
    migrationsTableName: "fastify_migrations",
    subscribers: [],
    synchronize: false,

    // 🔥 VERY IMPORTANT for Lambda
    extra: {
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 0,
    },
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
}

async function dbPlugin(fastify) {
  fastify.decorate("dataSource", null);
  fastify.decorateRequest("tenantDb", null);

  // ✅ Initialize ONCE (cold start)
  fastify.addHook("onReady", async () => {
    fastify.dataSource = await initDataSource();
  });

  // ✅ Reuse per request
  fastify.addHook("onRequest", async (request) => {
    request.db = fastify.dataSource;
  });
}

export default fp(dbPlugin);
