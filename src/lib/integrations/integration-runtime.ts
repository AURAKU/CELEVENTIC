import { prisma } from "@/lib/prisma";
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

/** Resolve provider credentials — DB overrides env when enabled. */
export async function getProviderCredentials(provider: string): Promise<ProviderCredentials> {
  const row = await prisma.apiSetting.findUnique({ where: { provider } });
  const envKey = ENV_SECRET_MAP[provider];
  const envSecret = envKey ? process.env[envKey] ?? null : null;
  const envPublic = envPublicKey(provider);

  if (!row) {
    return {
      enabled: envConfigured(provider),
      secret: envSecret,
      publicKey: envPublic,
      webhookUrl: null,
      config: {},
    };
  }

  const config = (row.config as Record<string, unknown>) ?? {};
  const secret = row.encryptedKey ? decrypt(row.encryptedKey) : envSecret;

  return {
    enabled: row.isEnabled,
    secret,
    publicKey: row.publicKey || envPublic,
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

export async function getProviderSecret(provider: string): Promise<string | null> {
  const creds = await getProviderCredentials(provider);
  if (!creds.enabled) return null;
  return creds.secret;
}
