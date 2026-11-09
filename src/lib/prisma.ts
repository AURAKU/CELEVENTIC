import { PrismaClient } from "@prisma/client";
import {
  applySqlitePragmas,
  assertSqliteSingleWriterDeployment,
} from "@/lib/db/sqlite-runtime";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSqliteReady: Promise<void> | undefined;
};

/**
 * Local preview / `ALLOW_DEV_RUNTIME=1` must be able to open a gift wallet even
 * when `.env` was never copied. SQLite path is schema-relative (`prisma/dev.db`).
 */
function ensureLocalDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;
  const allowDev =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_RUNTIME === "1";
  if (!allowDev) return;
  process.env.DATABASE_URL = "file:./dev.db";
}

ensureLocalDatabaseUrl();

function applySqliteSocketTimeout() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !url.startsWith("file:")) return;
  if (/[?&]socket_timeout=/.test(url)) return;
  process.env.DATABASE_URL = url.includes("?")
    ? `${url}&socket_timeout=30`
    : `${url}?socket_timeout=30`;
}

applySqliteSocketTimeout();
assertSqliteSingleWriterDeployment();

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
    message.includes("Prisma query timed out") ||
    message.includes("Invalid `prisma.")
  );
}

/** Fail fast instead of hanging invite/gift routes when the database is wedged. */
export async function prismaQueryWithTimeout<T>(
  operation: Promise<T>,
  timeoutMs = 2500
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Prisma query timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Always reuse one PrismaClient across hot reloads and production workers.
 * Recreating clients on every import (previous production behavior) multiplies
 * SQLite locks and causes socket timeouts under concurrent page loads.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

if (!globalForPrisma.prismaSqliteReady) {
  globalForPrisma.prismaSqliteReady = applySqlitePragmas(prisma).catch((error) => {
    if (process.env.NODE_ENV === "production") {
      console.error("[sqlite] pragma setup failed", error);
    }
  });
}
