import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { packageFeatureLabels } from "@/lib/packages/feature-catalog";

export type PricingPlan = {
  name: string;
  price: string;
  priceGhs: number;
  desc: string;
  guests: number;
  features: string[];
  popular: boolean;
  slug: string;
};

/** Always-visible marketing details when DB features are missing or non-displayable. */
const MARKETING_FEATURES_BY_SLUG: Record<string, string[]> = {
  starter: [
    "Digital invitations",
    "RSVP tracking",
    "QR admission",
    "Guest list (up to 50)",
    "Basic templates",
    "Shareable invite link",
  ],
  growth: [
    "Everything in Starter",
    "Ticketing & ticket QR",
    "Bulk SMS & WhatsApp credits",
    "Custom themes",
    "Guest list (up to 200)",
    "Event communications",
  ],
  premium: [
    "Everything in Growth",
    "Full event operating system",
    "Seating & Memory Vault",
    "Vendor marketplace access",
    "Offline QR scanning",
    "Guest list (up to 1,000)",
    "Analytics & collaboration",
  ],
  enterprise: [
    "Everything in Premium",
    "Unlimited-scale guest capacity",
    "Priority support",
    "Advanced messaging credits",
    "White-label ready workflow",
    "Dedicated success manager",
  ],
};

const FALLBACK_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "Free",
    priceGhs: 0,
    desc: "Perfect for intimate gatherings",
    guests: 50,
    features: MARKETING_FEATURES_BY_SLUG.starter,
    popular: false,
    slug: "starter",
  },
  {
    name: "Growth",
    price: "₵199",
    priceGhs: 199,
    desc: "For growing celebrations",
    guests: 200,
    features: MARKETING_FEATURES_BY_SLUG.growth,
    popular: true,
    slug: "growth",
  },
  {
    name: "Premium",
    price: "₵499",
    priceGhs: 499,
    desc: "Full event operating system",
    guests: 1000,
    features: MARKETING_FEATURES_BY_SLUG.premium,
    popular: false,
    slug: "premium",
  },
  {
    name: "Enterprise",
    price: "₵1,499",
    priceGhs: 1499,
    desc: "Unlimited scale",
    guests: 5000,
    features: MARKETING_FEATURES_BY_SLUG.enterprise,
    popular: false,
    slug: "enterprise",
  },
];

function buildQuotaFeatures(p: {
  guestLimit: number;
  invitationLimit: number;
  ticketLimit: number;
  smsCredits: number;
  whatsappCredits: number;
  emailCredits: number;
}): string[] {
  const lines: string[] = [
    `Up to ${p.guestLimit.toLocaleString()} guests`,
    `${p.invitationLimit.toLocaleString()} invitation sends`,
    `${p.ticketLimit.toLocaleString()} tickets`,
  ];
  if (p.smsCredits > 0) lines.push(`${p.smsCredits.toLocaleString()} SMS credits`);
  if (p.whatsappCredits > 0) lines.push(`${p.whatsappCredits.toLocaleString()} WhatsApp credits`);
  if (p.emailCredits > 0) lines.push(`${p.emailCredits.toLocaleString()} email credits`);
  return lines;
}

function sanitizeFeatureLabels(labels: string[]): string[] {
  return labels
    .map((l) => (typeof l === "string" ? l.trim() : ""))
    .filter((l) => l.length > 0 && l !== "true" && l !== "false");
}

function resolvePlanFeatures(
  p: {
    slug: string;
    name: string;
    features: unknown;
    guestLimit: number;
    invitationLimit: number;
    ticketLimit: number;
    smsCredits: number;
    whatsappCredits: number;
    emailCredits: number;
    packageFeatures?: { featureKey: string; isIncluded: boolean }[];
  }
): string[] {
  const fromRows =
    p.packageFeatures
      ?.filter((f) => f.isIncluded)
      .map((f) => f.featureKey) ?? [];

  const catalogLabels = sanitizeFeatureLabels(
    packageFeatureLabels(fromRows.length > 0 ? fromRows : p.features)
  );

  const marketing = sanitizeFeatureLabels(
    MARKETING_FEATURES_BY_SLUG[p.slug] ??
      MARKETING_FEATURES_BY_SLUG[p.name.toLowerCase()] ??
      FALLBACK_PLANS.find((f) => f.slug === p.slug)?.features ??
      []
  );

  const quotas = buildQuotaFeatures(p);

  // Marketing copy first so every tier always shows clear service details.
  // Fall back to catalog labels for unknown slugs; keep quotas as capacity cues.
  const merged: string[] = [];
  const seen = new Set<string>();
  const sources =
    marketing.length > 0
      ? [...marketing, ...quotas]
      : [...catalogLabels, ...quotas];

  for (const line of sources) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(line);
    if (merged.length >= 8) break;
  }

  if (merged.length === 0) {
    return [
      "Digital invitations",
      "RSVP tracking",
      "QR admission",
      `Up to ${p.guestLimit.toLocaleString()} guests`,
    ];
  }

  return merged;
}

function toPlans(
  packages: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: { toString(): string } | number;
    currency: string;
    guestLimit: number;
    invitationLimit: number;
    ticketLimit: number;
    smsCredits: number;
    whatsappCredits: number;
    emailCredits: number;
    features: unknown;
    packageFeatures?: { featureKey: string; isIncluded: boolean }[];
  }>
): PricingPlan[] {
  if (packages.length === 0) return FALLBACK_PLANS;

  return packages.map((p, i) => ({
    name: p.name,
    priceGhs: Number(p.price),
    price: Number(p.price) === 0 ? "Free" : formatCurrency(Number(p.price), p.currency),
    desc: p.description?.trim() || FALLBACK_PLANS.find((f) => f.slug === p.slug)?.desc || "Event package",
    guests: p.guestLimit,
    features: resolvePlanFeatures(p),
    popular: i === 1 || p.slug === "growth",
    slug: p.slug,
  }));
}

export const getActivePricingPlans = unstable_cache(
  async () => {
    const packages = await prisma.eventPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        packageFeatures: { select: { featureKey: true, isIncluded: true } },
      },
    });
    return toPlans(packages);
  },
  ["active-pricing-plans-v3"],
  { revalidate: 60, tags: ["pricing-plans"] }
);
