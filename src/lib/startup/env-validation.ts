export type EnvSeverity = "critical" | "warning" | "ok";

export interface EnvCheck {
  key: string;
  label: string;
  severity: EnvSeverity;
  message: string;
  present: boolean;
  /** Grouping for operator-facing Environment summary (never includes values). */
  group: "core" | "storage" | "payments" | "optional";
}

interface EnvSpec {
  key: string;
  label: string;
  required: boolean;
  productionOnly?: boolean;
  group: EnvCheck["group"];
  /** Alternate env keys that also count as present for this check. */
  aliases?: string[];
}

const ENV_SPECS: EnvSpec[] = [
  { key: "DATABASE_URL", label: "Database URL", required: true, group: "core" },
  { key: "NEXTAUTH_SECRET", label: "Auth secret", required: true, group: "core" },
  {
    key: "NEXT_PUBLIC_APP_URL",
    label: "App URL",
    required: true,
    group: "core",
    aliases: ["NEXTAUTH_URL"],
  },
  {
    key: "NEXTAUTH_URL",
    label: "Auth callback URL",
    required: true,
    productionOnly: true,
    group: "core",
  },
  { key: "AWS_REGION", label: "AWS region", required: false, group: "storage", aliases: ["AWS_DEFAULT_REGION"] },
  { key: "AWS_ACCESS_KEY_ID", label: "AWS access key", required: false, group: "storage" },
  { key: "AWS_SECRET_ACCESS_KEY", label: "AWS secret key", required: false, group: "storage" },
  { key: "AWS_S3_BUCKET", label: "AWS S3 bucket", required: false, group: "storage" },
  {
    key: "AWS_CLOUDFRONT_URL",
    label: "Media CDN / public base URL",
    required: false,
    group: "storage",
    aliases: ["AWS_S3_PUBLIC_BASE_URL", "AWS_S3_PUBLIC_URL", "NEXT_PUBLIC_MEDIA_CDN_URL"],
  },
  { key: "PAYSTACK_SECRET_KEY", label: "Paystack", required: false, group: "payments" },
  { key: "FLUTTERWAVE_SECRET_KEY", label: "Flutterwave", required: false, group: "payments" },
  { key: "GOOGLE_CLIENT_ID", label: "Google OAuth client ID", required: false, group: "optional" },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth client secret", required: false, group: "optional" },
  { key: "RESEND_API_KEY", label: "Email (Resend)", required: false, group: "optional" },
  { key: "OPENAI_API_KEY", label: "OpenAI", required: false, group: "optional" },
  { key: "REDIS_URL", label: "Redis", required: false, group: "optional" },
  { key: "SETUP_SECRET", label: "Admin bootstrap secret", required: false, productionOnly: true, group: "optional" },
];

const S3_REQUIRED_KEYS = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
] as const;

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function isPresent(spec: EnvSpec): boolean {
  if (readEnv(spec.key)) return true;
  return (spec.aliases ?? []).some((alias) => !!readEnv(alias));
}

export function validateEnvironment(): EnvCheck[] {
  const isProd = process.env.NODE_ENV === "production";

  return ENV_SPECS.map((spec) => {
    const present = isPresent(spec);
    const mustHave = spec.required || (isProd && !!spec.productionOnly);

    let severity: EnvSeverity = "ok";
    let message = "Configured";

    if (!present) {
      if (mustHave) {
        severity = "critical";
        message = `Missing required variable: ${spec.key}`;
      } else if (spec.group === "storage") {
        severity = "warning";
        message =
          spec.key === "AWS_CLOUDFRONT_URL"
            ? "CDN / public base URL not set — S3 virtual-host URLs will be used when S3 is enabled"
            : `${spec.label} not set — local disk upload fallback when S3 incomplete`;
      } else if (spec.group === "payments") {
        severity = "warning";
        message = `${spec.label} not configured — checkout disabled for this provider`;
      } else if (spec.key.startsWith("GOOGLE_") || spec.key === "RESEND_API_KEY") {
        severity = "warning";
        message = `${spec.label} not configured — feature disabled`;
      } else {
        severity = "warning";
        message = `${spec.label} not configured (optional)`;
      }
    }

    return {
      key: spec.key,
      label: spec.label,
      severity,
      message,
      present,
      group: spec.group,
    };
  });
}

export function getMissingCriticalEnv(): string[] {
  return validateEnvironment()
    .filter((c) => c.severity === "critical")
    .map((c) => c.key);
}

export type StorageMode = "aws-s3" | "aws-s3-no-cdn" | "local-fallback" | "aws-incomplete";

export interface StorageEnvSummary {
  mode: StorageMode;
  /** Operator message — never includes secret values. */
  message: string;
  /** Keys that are set (names only). */
  presentKeys: string[];
  /** Required S3 keys that are missing (names only). */
  missingRequiredKeys: string[];
  hasCdn: boolean;
}

/** Inspect S3-related env without exposing values. */
export function getStorageEnvSummary(): StorageEnvSummary {
  const region = !!(readEnv("AWS_REGION") || readEnv("AWS_DEFAULT_REGION"));
  const accessKey = !!readEnv("AWS_ACCESS_KEY_ID");
  const secret = !!readEnv("AWS_SECRET_ACCESS_KEY");
  const bucket = !!readEnv("AWS_S3_BUCKET");
  const hasCdn = !!(
    readEnv("AWS_CLOUDFRONT_URL") ||
    readEnv("AWS_S3_PUBLIC_BASE_URL") ||
    readEnv("AWS_S3_PUBLIC_URL") ||
    readEnv("NEXT_PUBLIC_MEDIA_CDN_URL")
  );

  const flags: Record<(typeof S3_REQUIRED_KEYS)[number], boolean> = {
    AWS_REGION: region,
    AWS_ACCESS_KEY_ID: accessKey,
    AWS_SECRET_ACCESS_KEY: secret,
    AWS_S3_BUCKET: bucket,
  };

  const presentKeys: string[] = S3_REQUIRED_KEYS.filter((k) => flags[k]);
  const missingRequiredKeys = S3_REQUIRED_KEYS.filter((k) => !flags[k]);
  if (hasCdn) presentKeys.push("AWS_CLOUDFRONT_URL");

  const anySet = presentKeys.length > 0 || hasCdn;
  const allRequired = missingRequiredKeys.length === 0;

  if (allRequired && hasCdn) {
    return {
      mode: "aws-s3",
      message: "AWS S3 + CDN configured — media uploads use cloud storage",
      presentKeys: [...presentKeys],
      missingRequiredKeys: [],
      hasCdn: true,
    };
  }
  if (allRequired) {
    return {
      mode: "aws-s3-no-cdn",
      message:
        "AWS S3 configured — add CloudFront / AWS_S3_PUBLIC_BASE_URL for fastest CDN delivery",
      presentKeys: [...presentKeys],
      missingRequiredKeys: [],
      hasCdn: false,
    };
  }
  if (anySet) {
    return {
      mode: "aws-incomplete",
      message: `AWS S3 incomplete (missing ${missingRequiredKeys.join(", ")}) — using local upload fallback`,
      presentKeys: [...presentKeys],
      missingRequiredKeys: [...missingRequiredKeys],
      hasCdn,
    };
  }
  return {
    mode: "local-fallback",
    message: "AWS S3 not configured — uploads use local disk fallback (dev-safe)",
    presentKeys: [],
    missingRequiredKeys: [...S3_REQUIRED_KEYS],
    hasCdn: false,
  };
}

export interface EnvironmentHealthSummary {
  /** Maps to system health: healthy | warning (degraded) | critical (failed). */
  status: "healthy" | "warning" | "critical";
  message: string;
  /** Human detail lines for operators (key names only, never values). */
  details: string[];
  storage: StorageEnvSummary;
  coreMissing: string[];
  paymentsConfigured: boolean;
}

/**
 * Environment row purpose: verify runtime env that the platform depends on
 * (database, auth, app URL) and report storage/payment readiness clearly.
 */
export function getEnvironmentHealthSummary(
  checks: EnvCheck[] = validateEnvironment()
): EnvironmentHealthSummary {
  const storage = getStorageEnvSummary();
  const coreMissing = checks.filter((c) => c.group === "core" && c.severity === "critical").map((c) => c.key);
  const paymentsConfigured = checks.some((c) => c.group === "payments" && c.present);

  const details: string[] = [];
  const coreOk = checks.filter((c) => c.group === "core" && c.present).map((c) => c.key);
  if (coreOk.length) details.push(`Core ready: ${coreOk.join(", ")}`);
  if (coreMissing.length) details.push(`Core missing: ${coreMissing.join(", ")}`);
  details.push(storage.message);
  details.push(
    paymentsConfigured
      ? "Payments: at least one provider key present"
      : "Payments: no provider keys — checkouts unavailable until configured"
  );

  if (coreMissing.length > 0 || storage.mode === "aws-incomplete") {
    return {
      status: coreMissing.length > 0 ? "critical" : "warning",
      message:
        coreMissing.length > 0
          ? `Failed — missing ${coreMissing.join(", ")}`
          : `Degraded — ${storage.message}`,
      details,
      storage,
      coreMissing,
      paymentsConfigured,
    };
  }

  if (storage.mode === "local-fallback" || storage.mode === "aws-s3-no-cdn" || !paymentsConfigured) {
    const parts: string[] = [];
    if (storage.mode === "local-fallback") parts.push("S3 unset → local uploads");
    else if (storage.mode === "aws-s3-no-cdn") parts.push("S3 on, CDN optional");
    else parts.push("S3 + CDN ready");
    if (!paymentsConfigured) parts.push("payments unset");
    return {
      status: "warning",
      message: `Degraded — ${parts.join("; ")}`,
      details,
      storage,
      coreMissing,
      paymentsConfigured,
    };
  }

  return {
    status: "healthy",
    message: "Environment connected — core, S3+CDN, and payments configured",
    details,
    storage,
    coreMissing,
    paymentsConfigured,
  };
}
