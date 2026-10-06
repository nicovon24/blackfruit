import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatoria para acceder a PostgreSQL.");
}

const globalForPrisma = globalThis as typeof globalThis & {
  blackfruitPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.blackfruitPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.blackfruitPrisma = prisma;
}
