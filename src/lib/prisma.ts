import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/*
 * the reason for this is that in development, Next.js hot reloads the server code, which would create a new instance of PrismaClient every time, leading to too many connections to the database.
 *
 * By attaching the PrismaClient instance to the global object, we ensure that we reuse the same instance across hot reloads, preventing the issue of too many connections.
 */
