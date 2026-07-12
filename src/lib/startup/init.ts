import { authLog } from "@/lib/auth/auth-logger";
import { checkDatabaseHealth } from "./db-health";
import { getMissingCriticalEnv, validateEnvironment } from "./env-validation";

let startupRan = false;

export async function runStartupChecks(): Promise<void> {
  if (startupRan) return;
  startupRan = true;

  authLog("startup_check", { phase: "begin" });

  const missing = getMissingCriticalEnv();
  if (missing.length > 0) {
    console.error(
      `[celeventic:startup] CRITICAL — missing environment variables: ${missing.join(", ")}`
    );
  }

  const envChecks = validateEnvironment();
  const warnings = envChecks.filter((c) => c.severity === "warning" && !c.present);
  if (warnings.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(
      `[celeventic:startup] Optional env not set: ${warnings.map((w) => w.key).join(", ")}`
    );
  }

  const db = await checkDatabaseHealth();
  if (db.status === "critical") {
    console.error(`[celeventic:startup] DATABASE: ${db.message}`, db.error ?? "");
  } else if (db.status === "warning") {
    console.warn(`[celeventic:startup] DATABASE: ${db.message}`);
  } else {
    authLog("startup_check", { phase: "database_ok", adminCount: db.adminCount });
  }

  authLog("startup_check", { phase: "complete", dbStatus: db.status });
}
