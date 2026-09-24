import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** True when Prisma cannot start (missing DATABASE_URL, unreachable server). */
export function isPrismaUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  const message = "message" in error ? String((error as { message?: unknown }).message) : "";
  return (
    name === "PrismaClientInitializationError" ||
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Can't reach database server") ||
    message.includes("Invalid `prisma.")
  );
}

/**
 * Always reuse one PrismaClient across hot reloads and production workers.
 * Recreating clients on every import (previous production behavior) multiplies
 * SQLite locks and causes socket timeouts under concurrent page loads.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
