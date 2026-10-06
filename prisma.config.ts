import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const envFile = process.env.BLACKFRUIT_ENV_FILE ?? ".env.local";
config({ path: envFile, override: true, quiet: true });
if (envFile === ".env.production.local" && process.env.NEON_BRANCH !== "production") {
  throw new Error("La migración de producción requiere NEON_BRANCH=production.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL_UNPOOLED") },
});
