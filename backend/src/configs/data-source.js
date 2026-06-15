import { DataSource } from "typeorm";
import "dotenv/config";

export const AppDataSource = new DataSource({
  type: process.env.DB_TYPE || "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // ✅ ADD ENTITIES HERE
  entities: ["src/entities/*.js"],

  // ✅ ADD MIGRATIONS HERE
  migrations: ["src/migrations/*.js"],

  synchronize: false,

  // ✅ Change migration table name here
  migrationsTableName: "fastify_migrations",
});
