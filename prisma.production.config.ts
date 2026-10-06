import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.production.local", override: true, quiet: true });

if (process.env.NEON_BRANCH !== "production") {
  throw new Error("La migración de producción requiere NEON_BRANCH=production.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL_UNPOOLED") },
});
