import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const envFile = process.env.BLACKFRUIT_ENV_FILE ?? ".env.local";
config({ path: envFile, override: true, quiet: true });
if (envFile === ".env.production.local" && process.env.NEON_BRANCH !== "production") {
  throw new Error("La migración de producción requiere NEON_BRANCH=production.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` no necesita conexión; migrate falla igual si falta la URL.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED },
});
