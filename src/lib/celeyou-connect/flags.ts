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
  tap_mode_enabled: boolean;
  tap_guest_exchange: boolean;
  tap_session_ttl_seconds: number;
  tap_session_create_limit: number;
};

export const DEFAULT_CELEYOU_CONNECT_FLAGS: CeleYouConnectFlags = {
  connect_two_way_exchange: true,
  connect_auto_followup: true,
  connect_notifications: true,
  connect_relationship_timeline: false,
  connect_enrichment: false,
  connect_crm_integrations: false,
  connect_enterprise: false,
  tap_mode_enabled: true,
  tap_guest_exchange: true,
  tap_session_ttl_seconds: 300,
  tap_session_create_limit: 8,
};

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function mergeCeleYouConnectFlags(raw: unknown): CeleYouConnectFlags {
  const incoming = raw && typeof raw === "object" ? (raw as Partial<CeleYouConnectFlags>) : {};
  const merged = { ...DEFAULT_CELEYOU_CONNECT_FLAGS, ...incoming };
  return {
    ...merged,
    tap_session_ttl_seconds: clampInt(
      incoming.tap_session_ttl_seconds ?? merged.tap_session_ttl_seconds,
      300,
      60,
      900
    ),
    tap_session_create_limit: clampInt(
      incoming.tap_session_create_limit ?? merged.tap_session_create_limit,
      8,
      1,
      40
    ),
  };
}

export function tapSessionTtlMs(flags: CeleYouConnectFlags) {
  return flags.tap_session_ttl_seconds * 1000;
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
