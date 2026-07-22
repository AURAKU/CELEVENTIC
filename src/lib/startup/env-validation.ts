export type EnvSeverity = "critical" | "warning" | "ok";

export interface EnvCheck {
  key: string;
  label: string;
  severity: EnvSeverity;
  message: string;
  present: boolean;
}

interface EnvSpec {
  key: string;
  label: string;
  required: boolean;
  productionOnly?: boolean;
}

const ENV_SPECS: EnvSpec[] = [
  { key: "DATABASE_URL", label: "Database", required: true },
  { key: "NEXTAUTH_SECRET", label: "Auth secret", required: true },
  { key: "NEXTAUTH_URL", label: "Auth URL", required: true, productionOnly: true },
  { key: "GOOGLE_CLIENT_ID", label: "Google OAuth client ID", required: false },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth client secret", required: false },
  { key: "RESEND_API_KEY", label: "Email (Resend)", required: false },
  { key: "AWS_REGION", label: "AWS region", required: false },
  { key: "AWS_ACCESS_KEY_ID", label: "AWS access key", required: false },
  { key: "AWS_SECRET_ACCESS_KEY", label: "AWS secret key", required: false },
  { key: "AWS_S3_BUCKET", label: "AWS S3 bucket", required: false },
  { key: "AWS_CLOUDFRONT_URL", label: "AWS CloudFront CDN URL", required: false },
  { key: "PAYSTACK_SECRET_KEY", label: "Paystack", required: false },
  { key: "OPENAI_API_KEY", label: "OpenAI", required: false },
  { key: "REDIS_URL", label: "Redis", required: false },
  { key: "SETUP_SECRET", label: "Admin bootstrap secret", required: false, productionOnly: true },
];

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export function validateEnvironment(): EnvCheck[] {
  const isProd = process.env.NODE_ENV === "production";

  return ENV_SPECS.map((spec) => {
    const present = !!readEnv(spec.key);
    const mustHave = spec.required || (isProd && spec.productionOnly);

    let severity: EnvSeverity = "ok";
    let message = "Configured";

    if (!present) {
      if (mustHave) {
        severity = "critical";
        message = `Missing required variable: ${spec.key}`;
      } else if (spec.key.startsWith("GOOGLE_") || spec.key === "RESEND_API_KEY") {
        severity = "warning";
        message = `${spec.label} not configured — feature disabled`;
      } else {
        severity = "warning";
        message = `${spec.label} not configured (optional)`;
      }
    }

    return { key: spec.key, label: spec.label, severity, message, present };
  });
}

export function getMissingCriticalEnv(): string[] {
  return validateEnvironment()
    .filter((c) => c.severity === "critical")
    .map((c) => c.key);
}
