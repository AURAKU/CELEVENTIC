import { prisma } from "@/lib/prisma";

export const CELEYOU_CONNECT_FLAGS_KEY = "celeyou.connect.flags";

export type CeleYouConnectFlags = {
  connect_two_way_exchange: boolean;
  connect_auto_followup: boolean;
  connect_notifications: boolean;
  connect_relationship_timeline: boolean;
  connect_enrichment: boolean;
  connect_crm_integrations: boolean;
  connect_enterprise: boolean;
};

export const DEFAULT_CELEYOU_CONNECT_FLAGS: CeleYouConnectFlags = {
  connect_two_way_exchange: true,
  connect_auto_followup: true,
  connect_notifications: true,
  connect_relationship_timeline: false,
  connect_enrichment: false,
  connect_crm_integrations: false,
  connect_enterprise: false,
};

export function mergeCeleYouConnectFlags(raw: unknown): CeleYouConnectFlags {
  const incoming = raw && typeof raw === "object" ? (raw as Partial<CeleYouConnectFlags>) : {};
  return { ...DEFAULT_CELEYOU_CONNECT_FLAGS, ...incoming };
}

export async function getCeleYouConnectFlags(): Promise<CeleYouConnectFlags> {
  const row = await prisma.adminSetting.findUnique({
    where: { key: CELEYOU_CONNECT_FLAGS_KEY },
  });
  return mergeCeleYouConnectFlags(row?.value);
}

export function isCeleYouConnectFlagOn(
  flags: CeleYouConnectFlags,
  key: keyof CeleYouConnectFlags
): boolean {
  return flags[key] === true;
}
