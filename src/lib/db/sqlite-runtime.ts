/**
 * SQLite production runtime guards.
 *
 * Ticket purchases are serialized in-process (`withTicketGate`). That is not a
 * database lock across Node processes. Production must run a single Next.js
 * writer against one SQLite file.
 */

const SQLITE_BUSY_TIMEOUT_MS = 5_000;

function isSqliteFileUrl(url?: string | null): boolean {
  return Boolean(url?.trim().startsWith("file:"));
}

export function assertSqliteSingleWriterDeployment(
  env: NodeJS.ProcessEnv = process.env
): void {
  if (env.NODE_ENV !== "production") return;
  if (!isSqliteFileUrl(env.DATABASE_URL)) return;
  if (env.CELEVENTIC_ALLOW_MULTI_WRITER === "1") {
    console.warn(
      "[sqlite] CELEVENTIC_ALLOW_MULTI_WRITER=1 is set. In-process ticket gates will not protect inventory across writers."
    );
    return;
  }

  const instances = Number(env.CELEVENTIC_WEB_INSTANCES ?? "1");
  if (Number.isFinite(instances) && instances > 1) {
    throw new Error(
      "SQLite production requires a single Next.js writer. Set ecosystem.config.js celeventic instances: 1 and exec_mode: fork. Do not use PM2 cluster against prisma/production.db."
    );
  }
}

export async function applySqlitePragmas(
  client: { $queryRawUnsafe: (sql: string) => Promise<unknown> }
): Promise<void> {
  if (!isSqliteFileUrl(process.env.DATABASE_URL)) return;
  await client.$queryRawUnsafe(`PRAGMA busy_timeout=${SQLITE_BUSY_TIMEOUT_MS}`);
  await client.$queryRawUnsafe("PRAGMA foreign_keys=ON");
  await client.$queryRawUnsafe("PRAGMA journal_mode=WAL");
  await client.$queryRawUnsafe("PRAGMA synchronous=NORMAL");
}
