import { prisma } from "@/lib/prisma";
import { countPlatformAdmins } from "@/lib/auth/verify-admin-account";

export type HealthStatus = "healthy" | "warning" | "critical";

export interface DbHealthResult {
  status: HealthStatus;
  connected: boolean;
  usersTable: boolean;
  adminExists: boolean;
  adminCount: number;
  message: string;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DbHealthResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    const adminCount = await countPlatformAdmins();

    let status: HealthStatus = "healthy";
    let message = "Database connected and schema reachable";

    if (adminCount === 0) {
      status = "warning";
      message = "Database OK but no active platform admin — run npm run seed:admin";
    }

    return {
      status,
      connected: true,
      usersTable: userCount >= 0,
      adminExists: adminCount > 0,
      adminCount,
      message,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const schemaMismatch =
      errMsg.includes("does not exist") ||
      errMsg.includes("Unknown column") ||
      errMsg.includes("no such table");

    return {
      status: "critical",
      connected: false,
      usersTable: false,
      adminExists: false,
      adminCount: 0,
      message: schemaMismatch
        ? "Database schema mismatch — run prisma db push or migrate deploy"
        : "Database connection failed",
      error: errMsg,
    };
  }
}
