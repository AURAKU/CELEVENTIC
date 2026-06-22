import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";
import {
  getCatalogEntry,
  INTEGRATION_CATALOG,
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
  async ensureCatalogSeeded() {
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
        update: {},
      });
    }
  }

  async list(): Promise<IntegrationListItem[]> {
    await this.ensureCatalogSeeded();
    const rows = await prisma.apiSetting.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] });
    return rows.map(toListItem);
  }

  async getById(id: string) {
    const row = await prisma.apiSetting.findUnique({ where: { id } });
    if (!row) return null;
    return toListItem(row);
  }

  async create(input: CreateIntegrationInput) {
    let provider = input.fromCatalog ?? input.provider;
    if (input.fromCatalog) {
      const catalog = getCatalogEntry(input.fromCatalog);
      if (!catalog) throw new Error("Unknown catalog provider");
      provider = catalog.provider;
    } else {
      provider = slugifyProvider(input.label);
    }

    const existing = await prisma.apiSetting.findUnique({ where: { provider } });
    if (existing) throw new Error("Integration already exists for this provider");

    const catalog = provider ? getCatalogEntry(provider) : undefined;

    const row = await prisma.apiSetting.create({
      data: {
        provider,
        label: input.label || catalog?.label || provider,
        category: input.category ?? catalog?.category ?? "custom",
        description: input.description ?? catalog?.description,
        publicKey: input.publicKey,
        webhookUrl: input.webhookUrl,
        config: (input.config ?? {}) as Prisma.InputJsonValue,
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
        default:
          if (creds.secret || envConfiguredForProvider(row.provider)) {
            return {
              ok: true,
              message: `${row.label ?? row.provider} credentials stored. Live test not implemented for this provider.`,
            };
          }
          return {
            ok: false,
            message: `Configure a secret key or set env vars: ${catalog?.envKeys?.join(", ") ?? "N/A"}`,
          };
      }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection test failed" };
    }
  }
}

export const integrationService = new IntegrationService();
