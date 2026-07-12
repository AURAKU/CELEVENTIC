import { checkDatabaseHealth, type HealthStatus } from "./db-health";
import { validateEnvironment } from "./env-validation";

export interface ServiceHealth {
  id: string;
  label: string;
  status: HealthStatus;
  message: string;
}

export interface SystemHealthReport {
  checkedAt: string;
  overall: HealthStatus;
  services: ServiceHealth[];
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  return "healthy";
}

function envGroupStatus(keys: string[], envChecks: ReturnType<typeof validateEnvironment>): HealthStatus {
  const group = envChecks.filter((c) => keys.includes(c.key));
  if (group.some((c) => c.severity === "critical")) return "critical";
  if (group.some((c) => !c.present)) return "warning";
  return "healthy";
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const envChecks = validateEnvironment();
  const db = await checkDatabaseHealth();

  const authStatus = envGroupStatus(["NEXTAUTH_SECRET", "NEXTAUTH_URL"], envChecks);
  const emailStatus = envGroupStatus(["RESEND_API_KEY"], envChecks);
  const paymentStatus = envGroupStatus(["PAYSTACK_SECRET_KEY", "FLUTTERWAVE_SECRET_KEY"], envChecks);
  const storageStatus = envGroupStatus(
    ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    envChecks
  );
  const redisStatus = envGroupStatus(["REDIS_URL"], envChecks);
  const pusherStatus = envGroupStatus(["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET"], envChecks);
  const googleStatus = envGroupStatus(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], envChecks);

  const envCritical = envChecks.filter((c) => c.severity === "critical");
  const envStatus: HealthStatus =
    envCritical.length > 0 ? "critical" : envChecks.some((c) => !c.present) ? "warning" : "healthy";

  const services: ServiceHealth[] = [
    { id: "database", label: "Database", status: db.status, message: db.message },
    {
      id: "authentication",
      label: "Authentication",
      status: authStatus === "healthy" && db.connected ? "healthy" : authStatus,
      message:
        authStatus === "healthy" ? "NextAuth configured" : "Missing NEXTAUTH_SECRET or NEXTAUTH_URL",
    },
    {
      id: "email",
      label: "Email",
      status: emailStatus,
      message: emailStatus === "healthy" ? "Resend configured" : "Email provider not configured",
    },
    {
      id: "payments",
      label: "Payments",
      status: paymentStatus,
      message: paymentStatus === "healthy" ? "Payment provider configured" : "No payment keys configured",
    },
    {
      id: "storage",
      label: "Storage",
      status: storageStatus,
      message: storageStatus === "healthy" ? "Cloudinary configured" : "Cloudinary not fully configured",
    },
    {
      id: "redis",
      label: "Redis",
      status: redisStatus,
      message: redisStatus === "healthy" ? "Redis configured" : "Redis optional — not configured",
    },
    {
      id: "pusher",
      label: "Pusher",
      status: pusherStatus,
      message: pusherStatus === "healthy" ? "Pusher configured" : "Realtime optional — not configured",
    },
    {
      id: "google_oauth",
      label: "Google OAuth",
      status: googleStatus,
      message: googleStatus === "healthy" ? "Google OAuth configured" : "Google sign-in disabled",
    },
    {
      id: "environment",
      label: "Environment",
      status: envStatus,
      message:
        envCritical.length > 0
          ? `Missing: ${envCritical.map((c) => c.key).join(", ")}`
          : "Core environment variables present",
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    overall: worstStatus(services.map((s) => s.status)),
    services,
  };
}
