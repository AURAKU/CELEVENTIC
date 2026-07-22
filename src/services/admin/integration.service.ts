import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";
import {
  getCatalogEntry,
  INTEGRATION_CATALOG,
  isRetiredProvider,
  slugifyProvider,
  type IntegrationCategory,
} from "@/lib/integrations/integration-catalog";

export interface IntegrationListItem {
  id: string;
  provider: string;
  label: string;
  category: IntegrationCategory;
  description: string | null;
  isEnabled: boolean;
  hasSecret: boolean;
  hasEnvFallback: boolean;
  publicKey: string | null;
  webhookUrl: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;
  docsUrl: string | null;
  webhookPath: string | null;
}

export interface CreateIntegrationInput {
  provider?: string;
  label: string;
  category: IntegrationCategory;
  description?: string;
  secret?: string;
  publicKey?: string;
  webhookUrl?: string;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
  fromCatalog?: string;
}

export interface UpdateIntegrationInput {
  label?: string;
  category?: IntegrationCategory;
  description?: string;
  secret?: string;
  publicKey?: string;
  webhookUrl?: string;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
}

function envConfiguredForProvider(provider: string): boolean {
  const entry = getCatalogEntry(provider);
  if (!entry?.envKeys?.length) return false;
  return entry.envKeys.some((k) => !!process.env[k]);
}

function toListItem(row: {
  id: string;
  provider: string;
  label: string | null;
  category: string;
  description: string | null;
  isEnabled: boolean;
  encryptedKey: string | null;
  publicKey: string | null;
  webhookUrl: string | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}): IntegrationListItem {
  const catalog = getCatalogEntry(row.provider);
  return {
    id: row.id,
    provider: row.provider,
    label: row.label ?? catalog?.label ?? row.provider,
    category: (row.category as IntegrationCategory) ?? "custom",
    description: row.description ?? catalog?.description ?? null,
    isEnabled: row.isEnabled,
    hasSecret: !!row.encryptedKey,
    hasEnvFallback: envConfiguredForProvider(row.provider),
    publicKey: row.publicKey,
    webhookUrl: row.webhookUrl,
    config: (row.config as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isCustom: row.provider.startsWith("CUSTOM_"),
    docsUrl: catalog?.docsUrl ?? null,
    webhookPath: catalog?.webhookPath ?? null,
  };
}

export class IntegrationService {
  /** Disable legacy providers removed from the product catalog. */
  async retireDeprecatedProviders() {
    await prisma.apiSetting.updateMany({
      where: {
        provider: {
          in: [
            "FLUTTERWAVE",
            "HUBTEL",
            "ANTHROPIC",
            "GOOGLE_MAPS",
            "SENTRY",
            "POSTHOG",
            "PUSHER",
            "LARAVEL_API",
          ],
        },
        isEnabled: true,
      },
      data: { isEnabled: false },
    });
  }

  async ensureCatalogSeeded() {
    await this.retireDeprecatedProviders();
    for (const entry of INTEGRATION_CATALOG) {
      await prisma.apiSetting.upsert({
        where: { provider: entry.provider },
        create: {
          provider: entry.provider,
          label: entry.label,
          category: entry.category,
          description: entry.description,
          config: {},
          isEnabled: envConfiguredForProvider(entry.provider),
        },
        update: {
          label: entry.label,
          category: entry.category,
          description: entry.description,
        },
      });
    }
  }

  async list(): Promise<IntegrationListItem[]> {
    await this.ensureCatalogSeeded();
    const rows = await prisma.apiSetting.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] });
    // Hide retired providers from the hub; keep CUSTOM_* and active catalog
    return rows.filter((r) => !isRetiredProvider(r.provider)).map(toListItem);
  }

  async getById(id: string) {
    const row = await prisma.apiSetting.findUnique({ where: { id } });
    if (!row || isRetiredProvider(row.provider)) return null;
    return toListItem(row);
  }

  async create(input: CreateIntegrationInput) {
    let provider = input.fromCatalog ?? input.provider;
    if (input.fromCatalog) {
      const catalog = getCatalogEntry(input.fromCatalog);
      if (!catalog) throw new Error("Unknown catalog provider");
      if (isRetiredProvider(catalog.provider)) {
        throw new Error("This provider has been removed from Celeventic");
      }
      provider = catalog.provider;
    } else {
      if (!input.label?.trim()) throw new Error("Label is required for a custom API");
      provider = slugifyProvider(input.label);
    }

    const existing = await prisma.apiSetting.findUnique({ where: { provider } });
    if (existing) throw new Error("Integration already exists for this provider");

    const catalog = provider ? getCatalogEntry(provider) : undefined;
    const config = { ...(input.config ?? {}) } as Record<string, unknown>;

    const row = await prisma.apiSetting.create({
      data: {
        provider: provider!,
        label: input.label || catalog?.label || provider,
        category: input.category ?? catalog?.category ?? "custom",
        description: input.description ?? catalog?.description,
        publicKey: input.publicKey,
        webhookUrl: input.webhookUrl,
        config: config as Prisma.InputJsonValue,
        isEnabled: input.isEnabled ?? false,
        encryptedKey: input.secret ? encrypt(input.secret) : undefined,
      },
    });

    return toListItem(row);
  }

  async update(id: string, input: UpdateIntegrationInput) {
    const existing = await prisma.apiSetting.findUnique({ where: { id } });
    if (!existing) throw new Error("Integration not found");

    const data: Parameters<typeof prisma.apiSetting.update>[0]["data"] = {};

    if (input.label !== undefined) data.label = input.label;
    if (input.category !== undefined) data.category = input.category;
    if (input.description !== undefined) data.description = input.description;
    if (input.publicKey !== undefined) data.publicKey = input.publicKey || null;
    if (input.webhookUrl !== undefined) data.webhookUrl = input.webhookUrl || null;
    if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;
    if (input.config !== undefined) data.config = input.config as Prisma.InputJsonValue;
    if (input.secret && input.secret.trim()) {
      data.encryptedKey = encrypt(input.secret.trim());
    }

    const row = await prisma.apiSetting.update({ where: { id }, data });
    return toListItem(row);
  }

  async remove(id: string) {
    const existing = await prisma.apiSetting.findUnique({ where: { id } });
    if (!existing) throw new Error("Integration not found");
    if (!existing.provider.startsWith("CUSTOM_")) {
      throw new Error("Built-in integrations cannot be deleted — disable them instead");
    }
    await prisma.apiSetting.delete({ where: { id } });
    return { provider: existing.provider };
  }

  async clearSecret(id: string) {
    const row = await prisma.apiSetting.update({
      where: { id },
      data: { encryptedKey: null },
    });
    return toListItem(row);
  }

  async testConnection(id: string): Promise<{ ok: boolean; message: string }> {
    const row = await prisma.apiSetting.findUnique({ where: { id } });
    if (!row) return { ok: false, message: "Integration not found" };

    const creds = row.encryptedKey
      ? { secret: (await import("@/lib/encryption")).decrypt(row.encryptedKey), publicKey: row.publicKey }
      : { secret: null, publicKey: row.publicKey };

    const catalog = getCatalogEntry(row.provider);

    try {
      switch (row.provider) {
        case "PAYSTACK": {
          const key = creds.secret ?? process.env.PAYSTACK_SECRET_KEY;
          if (!key) return { ok: false, message: "No secret key configured" };
          const res = await fetch("https://api.paystack.co/bank?perPage=1", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return res.ok
            ? { ok: true, message: "Paystack connection verified" }
            : { ok: false, message: `Paystack returned ${res.status}` };
        }
        case "OPENAI": {
          const key = creds.secret ?? process.env.OPENAI_API_KEY;
          if (!key) return { ok: false, message: "No API key configured" };
          const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return res.ok
            ? { ok: true, message: "OpenAI connection verified" }
            : { ok: false, message: `OpenAI returned ${res.status}` };
        }
        case "RESEND": {
          const key = creds.secret ?? process.env.RESEND_API_KEY;
          if (!key) return { ok: false, message: "No API key configured" };
          const res = await fetch("https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${key}` },
          });
          return res.ok || res.status === 403
            ? { ok: true, message: "Resend API key accepted" }
            : { ok: false, message: `Resend returned ${res.status}` };
        }
        case "WHATSAPP": {
          const token = creds.secret ?? process.env.WHATSAPP_BUSINESS_TOKEN;
          const phoneId =
            creds.publicKey ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
          if (!token) return { ok: false, message: "No WhatsApp access token" };
          if (!phoneId) {
            return { ok: false, message: "Phone Number ID required (Public Key field)" };
          }
          const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return res.ok
            ? { ok: true, message: "WhatsApp Business connection verified" }
            : { ok: false, message: `WhatsApp Graph API returned ${res.status}` };
        }
        case "SMS": {
          const config = (row.config as Record<string, unknown>) ?? {};
          if (creds.secret || envConfiguredForProvider("SMS")) {
            return {
              ok: true,
              message: config.endpoint
                ? `SMS credentials stored. Gateway: ${String(config.endpoint)}`
                : "SMS credentials stored. Set config.endpoint for your SMS gateway URL.",
            };
          }
          return { ok: false, message: "No SMS API key configured" };
        }
        case "AWS_S3": {
          const { resolveAwsS3Config } = await import("@/lib/uploads/aws-s3");
          const cfg = await resolveAwsS3Config();
          if (!cfg) {
            return {
              ok: false,
              message:
                "AWS S3 incomplete. Need Access Key ID, Secret Access Key, plus region + bucket (env or config JSON).",
            };
          }
          return {
            ok: true,
            message: cfg.publicBaseUrl
              ? `S3 ready (${cfg.bucket} / ${cfg.region}) with CDN`
              : `S3 ready (${cfg.bucket} / ${cfg.region}) — add CloudFront URL for CDN`,
          };
        }
        case "REDIS": {
          const url = creds.secret ?? process.env.REDIS_URL;
          if (!url) return { ok: false, message: "No Redis URL configured" };
          return { ok: true, message: "Redis URL configured for caching and rate limits" };
        }
        case "GOOGLE_OAUTH": {
          const secret = creds.secret ?? process.env.GOOGLE_CLIENT_SECRET;
          const clientId = creds.publicKey ?? process.env.GOOGLE_CLIENT_ID;
          if (!secret || !clientId) {
            return { ok: false, message: "Google Client ID and Client Secret required" };
          }
          return { ok: true, message: "Google OAuth credentials present" };
        }
        default: {
          // Custom APIs — optional live ping when config.endpoint is set
          const config = (row.config as Record<string, unknown>) ?? {};
          const endpoint = typeof config.endpoint === "string" ? config.endpoint.trim() : "";
          if (endpoint) {
            try {
              const headers: Record<string, string> = { Accept: "application/json" };
              if (creds.secret) headers.Authorization = `Bearer ${creds.secret}`;
              const res = await fetch(endpoint, {
                method: "GET",
                headers,
                signal: AbortSignal.timeout(8000),
              });
              return res.ok || res.status === 401 || res.status === 403
                ? {
                    ok: true,
                    message: `Reached ${endpoint} (HTTP ${res.status}). Integration is wired for runtime use.`,
                  }
                : { ok: false, message: `Endpoint returned HTTP ${res.status}` };
            } catch (e) {
              return {
                ok: false,
                message: e instanceof Error ? e.message : "Could not reach custom endpoint",
              };
            }
          }
          if (creds.secret || creds.publicKey || envConfiguredForProvider(row.provider)) {
            return {
              ok: true,
              message: `${row.label ?? row.provider} credentials stored. Add config.endpoint to run a live connectivity test.`,
            };
          }
          return {
            ok: false,
            message: `Configure a secret key or set env vars: ${catalog?.envKeys?.join(", ") ?? "N/A"}`,
          };
        }
      }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection test failed" };
    }
  }
}

export const integrationService = new IntegrationService();
