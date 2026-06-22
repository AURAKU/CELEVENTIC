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
  FLUTTERWAVE: "FLUTTERWAVE_SECRET_KEY",
  HUBTEL: "HUBTEL_CLIENT_SECRET",
  RESEND: "RESEND_API_KEY",
  SMS: "SMS_PROVIDER_API_KEY",
  WHATSAPP: "WHATSAPP_BUSINESS_TOKEN",
  OPENAI: "OPENAI_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GOOGLE_MAPS: "GOOGLE_MAPS_API_KEY",
  CLOUDINARY: "CLOUDINARY_API_SECRET",
  GOOGLE_OAUTH: "GOOGLE_CLIENT_SECRET",
  SENTRY: "SENTRY_DSN",
  POSTHOG: "NEXT_PUBLIC_POSTHOG_KEY",
  REDIS: "REDIS_URL",
  PUSHER: "PUSHER_SECRET",
  LARAVEL_API: "LARAVEL_API_TOKEN",
};

function envConfigured(provider: string): boolean {
  const entry = getCatalogEntry(provider);
  if (entry?.envKeys?.length) {
    return entry.envKeys.some((k) => !!process.env[k]);
  }
  const key = ENV_SECRET_MAP[provider];
  return key ? !!process.env[key] : false;
}

/** Resolve provider credentials — DB overrides env when enabled. */
export async function getProviderCredentials(provider: string): Promise<ProviderCredentials> {
  const row = await prisma.apiSetting.findUnique({ where: { provider } });
  const envKey = ENV_SECRET_MAP[provider];
  const envSecret = envKey ? process.env[envKey] ?? null : null;

  if (!row) {
    return {
      enabled: envConfigured(provider),
      secret: envSecret,
      publicKey: null,
      webhookUrl: null,
      config: {},
    };
  }

  const config = (row.config as Record<string, unknown>) ?? {};
  const secret = row.encryptedKey ? decrypt(row.encryptedKey) : envSecret;

  return {
    enabled: row.isEnabled,
    secret,
    publicKey: row.publicKey,
    webhookUrl: row.webhookUrl,
    config,
  };
}

export async function isProviderEnabled(provider: string): Promise<boolean> {
  const creds = await getProviderCredentials(provider);
  if (!creds.enabled) return false;
  return !!(creds.secret || envConfigured(provider));
}

export async function getProviderSecret(provider: string): Promise<string | null> {
  const creds = await getProviderCredentials(provider);
  if (!creds.enabled) return null;
  return creds.secret;
}
