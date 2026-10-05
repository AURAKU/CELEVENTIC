import { prisma, prismaQueryWithTimeout } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getCatalogEntry } from "@/lib/integrations/integration-catalog";

export interface ProviderCredentials {
  enabled: boolean;
  secret: string | null;
  publicKey: string | null;
  webhookUrl: string | null;
  config: Record<string, unknown>;
}

const ENV_SECRET_MAP: Record<string, string> = {
  PAYSTACK: "PAYSTACK_SECRET_KEY",
  RESEND: "RESEND_API_KEY",
  SMS: "SMS_PROVIDER_API_KEY",
  WHATSAPP: "WHATSAPP_BUSINESS_TOKEN",
  OPENAI: "OPENAI_API_KEY",
  AWS_S3: "AWS_SECRET_ACCESS_KEY",
  GOOGLE_OAUTH: "GOOGLE_CLIENT_SECRET",
  REDIS: "REDIS_URL",
};

function envConfigured(provider: string): boolean {
  const entry = getCatalogEntry(provider);
  if (entry?.envKeys?.length) {
    return entry.envKeys.some((k) => !!process.env[k]);
  }
  const key = ENV_SECRET_MAP[provider];
  return key ? !!process.env[key] : false;
}

function envPublicKey(provider: string): string | null {
  switch (provider) {
    case "PAYSTACK":
      return process.env.PAYSTACK_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? null;
    case "WHATSAPP":
      return process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
    case "AWS_S3":
      return process.env.AWS_ACCESS_KEY_ID ?? null;
    case "GOOGLE_OAUTH":
      return process.env.GOOGLE_CLIENT_ID ?? null;
    default:
      return null;
  }
}

async function readProviderSettingRow(provider: string) {
  try {
    return await prismaQueryWithTimeout(
      prisma.apiSetting.findUnique({ where: { provider } }),
      2000
    );
  } catch {
    return null;
  }
}

function decryptOrNull(encryptedKey: string | null | undefined): string | null {
  if (!encryptedKey?.trim()) return null;
  try {
    return decrypt(encryptedKey);
  } catch {
    return null;
  }
}

/**
 * Resolve provider credentials.
 * Env keys are always readable (Paystack must not wait on a stuck database).
 * A stored Admin row still wins when it is present and enabled.
 */
export async function getProviderCredentials(provider: string): Promise<ProviderCredentials> {
  const envKey = ENV_SECRET_MAP[provider];
  const envSecret = envKey ? process.env[envKey]?.trim() || null : null;
  const envPublic = envPublicKey(provider)?.trim() || null;
  const fromEnv: ProviderCredentials = {
    enabled: envConfigured(provider),
    secret: envSecret,
    publicKey: envPublic,
    webhookUrl: null,
    config: {},
  };

  const row = await readProviderSettingRow(provider);
  if (!row) return fromEnv;

  const config = (row.config as Record<string, unknown>) ?? {};
  const secret = decryptOrNull(row.encryptedKey) || envSecret;

  return {
    enabled: row.isEnabled || fromEnv.enabled,
    secret,
    publicKey: row.publicKey?.trim() || envPublic,
    webhookUrl: row.webhookUrl,
    config,
  };
}

export async function isProviderEnabled(provider: string): Promise<boolean> {
  const creds = await getProviderCredentials(provider);
  if (!creds.enabled) return false;
  // Custom APIs: enabled + secret (or endpoint-only with public base URL) counts
  if (provider.startsWith("CUSTOM_")) {
    return !!(creds.secret || creds.publicKey || creds.config.endpoint || creds.webhookUrl);
  }
  return !!(creds.secret || envConfigured(provider));
}

/**
 * Distinguish integration readiness without exposing secrets.
 * - healthy: enabled and credentials present
 * - disabled: explicitly off (or no DB/env activation)
 * - missing_credentials: marked enabled but no API key
 * - failing: reserved for probe failures (caller may override after a live test)
 */
export type ProviderHealthState =
  | "healthy"
  | "disabled"
  | "missing_credentials"
  | "failing";

export function classifyProviderHealth(
  creds: Pick<ProviderCredentials, "enabled" | "secret" | "publicKey" | "config" | "webhookUrl">,
  provider: string
): { state: ProviderHealthState; message: string } {
  if (!creds.enabled) {
    return {
      state: "disabled",
      message: `${provider} is disabled. Email notifications unavailable until configured in Admin → Integrations.`,
    };
  }

  const hasCreds = provider.startsWith("CUSTOM_")
    ? !!(creds.secret || creds.publicKey || creds.config.endpoint || creds.webhookUrl)
    : !!creds.secret;

  if (!hasCreds) {
    return {
      state: "missing_credentials",
      message: `${provider} is enabled but missing credentials. Add an API key in Admin → Integrations.`,
    };
  }

  return {
    state: "healthy",
    message: `${provider} is configured and ready.`,
  };
}

export async function getProviderHealth(
  provider: string
): Promise<{ state: ProviderHealthState; message: string; enabled: boolean }> {
  const creds = await getProviderCredentials(provider);
  const classified = classifyProviderHealth(creds, provider);
  return {
    ...classified,
    enabled: classified.state === "healthy",
  };
}

export async function getProviderSecret(provider: string): Promise<string | null> {
  const creds = await getProviderCredentials(provider);
  if (!creds.enabled) return null;
  return creds.secret;
}
