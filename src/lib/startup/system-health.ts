import { getAwsStorageHealth, isAwsS3Configured } from "@/lib/uploads/aws-s3";
import { checkDatabaseHealth, type HealthStatus } from "./db-health";
import {
  getEnvironmentHealthSummary,
  getStorageEnvSummary,
  validateEnvironment,
} from "./env-validation";

export interface ServiceHealth {
  id: string;
  label: string;
  status: HealthStatus;
  message: string;
  /** Optional deep-link for operators (admin UI). */
  href?: string;
  /** Extra lines — key names / modes only, never secret values. */
  details?: string[];
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

/** All listed keys must be present (e.g. Google client ID + secret). */
function envAllPresent(keys: string[], envChecks: ReturnType<typeof validateEnvironment>): HealthStatus {
  const group = envChecks.filter((c) => keys.includes(c.key));
  if (group.some((c) => c.severity === "critical")) return "critical";
  if (group.length === 0) return "warning";
  if (group.every((c) => c.present)) return "healthy";
  return "warning";
}

/** At least one listed key present (e.g. Paystack OR Flutterwave). */
function envAnyPresent(keys: string[], envChecks: ReturnType<typeof validateEnvironment>): HealthStatus {
  const group = envChecks.filter((c) => keys.includes(c.key));
  if (group.some((c) => c.present)) return "healthy";
  return "warning";
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const envChecks = validateEnvironment();
  const envSummary = getEnvironmentHealthSummary(envChecks);
  const storageSummary = getStorageEnvSummary();
  const db = await checkDatabaseHealth();

  const authSecret = envChecks.find((c) => c.key === "NEXTAUTH_SECRET")?.present;
  const authUrl =
    envChecks.find((c) => c.key === "NEXTAUTH_URL")?.present ||
    envChecks.find((c) => c.key === "NEXT_PUBLIC_APP_URL")?.present;
  const authStatus: HealthStatus = !authSecret ? "critical" : !authUrl ? "warning" : "healthy";

  const emailStatus = envAllPresent(["RESEND_API_KEY"], envChecks);
  const paymentStatus = envAnyPresent(["PAYSTACK_SECRET_KEY", "FLUTTERWAVE_SECRET_KEY"], envChecks);

  const awsStorage = getAwsStorageHealth();
  // Incomplete keys = degraded (app still runs on local fallback); full S3+CDN = healthy.
  const storageStatus: HealthStatus =
    storageSummary.mode === "aws-s3"
      ? "healthy"
      : storageSummary.mode === "aws-s3-no-cdn"
        ? "warning"
        : "warning";

  const redisStatus = envAllPresent(["REDIS_URL"], envChecks);
  const pusherPresent = ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET"].every(
    (k) => !!process.env[k]?.trim()
  );
  const pusherStatus: HealthStatus = pusherPresent ? "healthy" : "warning";
  const googleStatus = envAllPresent(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], envChecks);

  const services: ServiceHealth[] = [
    { id: "database", label: "Database", status: db.status, message: db.message },
    {
      id: "authentication",
      label: "Authentication",
      status: authStatus === "healthy" && db.connected ? "healthy" : authStatus === "healthy" ? "warning" : authStatus,
      message:
        authStatus === "healthy"
          ? "NextAuth secret + app URL configured"
          : !authSecret
            ? "Missing NEXTAUTH_SECRET"
            : "Missing NEXTAUTH_URL / NEXT_PUBLIC_APP_URL",
    },
    {
      id: "email",
      label: "Email",
      status: emailStatus,
      message: emailStatus === "healthy" ? "Resend configured" : "Email provider not configured",
      href: "/admin/integrations",
    },
    {
      id: "payments",
      label: "Payments",
      status: paymentStatus,
      message:
        paymentStatus === "healthy"
          ? "Payment provider configured"
          : "No payment keys configured — set Paystack (or Flutterwave) in env or Integrations",
      href: "/admin/integrations",
    },
    {
      id: "storage",
      label: "Storage (AWS S3)",
      status: storageStatus,
      message: awsStorage.message,
      href: "/admin/integrations",
      details: [
        `Mode: ${storageSummary.mode}`,
        storageSummary.presentKeys.length
          ? `Present: ${storageSummary.presentKeys.join(", ")}`
          : "No AWS S3 keys set",
        ...(storageSummary.missingRequiredKeys.length && storageSummary.mode !== "aws-s3"
          ? [`Missing: ${storageSummary.missingRequiredKeys.join(", ")}`]
          : []),
        isAwsS3Configured()
          ? "Uploads route to S3 when credentials resolve"
          : "Uploads fall back to local disk /api/uploads",
      ],
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
      href: "/admin/integrations",
    },
    {
      id: "environment",
      label: "Environment",
      status: envSummary.status,
      message: envSummary.message,
      href: "/admin/integrations",
      details: envSummary.details,
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    overall: worstStatus(services.map((s) => s.status)),
    services,
  };
}
