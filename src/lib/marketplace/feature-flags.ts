import { prisma } from "@/lib/prisma";

export interface MarketplaceFeatureFlags {
  marketplaceEnabled: boolean;
  quotesEnabled: boolean;
  bookingsEnabled: boolean;
  escrowEnabled: boolean;
  reviewsRequireBooking: boolean;
  vendorApprovalRequired: boolean;
  defaultCommissionPercent: number;
}

const DEFAULT_FLAGS: MarketplaceFeatureFlags = {
  marketplaceEnabled: true,
  quotesEnabled: true,
  bookingsEnabled: true,
  escrowEnabled: true,
  reviewsRequireBooking: true,
  vendorApprovalRequired: false,
  defaultCommissionPercent: 10,
};

const SETTINGS_KEY = "marketplace.feature.flags";

export async function getMarketplaceFeatureFlags(): Promise<MarketplaceFeatureFlags> {
  try {
    const row = await prisma.adminSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row?.value || typeof row.value !== "object") return DEFAULT_FLAGS;
    return { ...DEFAULT_FLAGS, ...(row.value as Partial<MarketplaceFeatureFlags>) };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export async function isMarketplaceEnabled(): Promise<boolean> {
  const flags = await getMarketplaceFeatureFlags();
  return flags.marketplaceEnabled;
}

export async function getDefaultCommissionPercent(): Promise<number> {
  const flags = await getMarketplaceFeatureFlags();
  const rule = await prisma.marketplaceCommissionRule.findFirst({
    where: { key: "global", isActive: true },
  });
  if (rule) return Number(rule.commissionPercent);
  return flags.defaultCommissionPercent;
}
