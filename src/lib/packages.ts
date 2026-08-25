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
  invitations: number;
  features: string[];
  popular: boolean;
  slug: string;
};

/** Always-visible marketing details when DB features are missing or non-displayable. */
const MARKETING_FEATURES_BY_SLUG: Record<string, string[]> = {
  starter: [
    "Digital invitations",
    "Up to 5 invitations",
    "RSVP tracking",
    "QR admission",
    "Guest list (up to 5)",
    "Basic templates",
    "Upgrade anytime for more capacity",
  ],
  growth: [
    "Everything in Free",
    "Ticketing & ticket QR",
    "Bulk SMS & WhatsApp credits",
    "Custom themes",
    "Digital business card trial",
    "Guest list (up to 100)",
    "Event communications",
  ],
  premium: [
    "Everything in Growth",
    "Full event operating system",
    "Seating & Memory Vault",
    "Vendor marketplace access",
    "Offline QR scanning",
    "Digital business card (QR + NFC)",
    "Guest list (up to 300)",
    "Analytics & collaboration",
  ],
  enterprise: [
    "Everything in Premium",
    "Unlimited-scale guest capacity",
    "Priority support",
    "Advanced messaging credits",
    "White-label ready workflow",
    "Dedicated success manager",
    "Team digital business cards",
  ],
};

const FALLBACK_PLANS: PricingPlan[] = [
  {
    name: "Free",
    price: "Free",
    priceGhs: 0,
    desc: "Try Celeventic with a small gathering — upgrade when you need more",
    guests: 5,
    invitations: 5,
    features: MARKETING_FEATURES_BY_SLUG.starter,
    popular: false,
    slug: "starter",
  },
  {
    name: "Growth",
    price: "₵299",
    priceGhs: 299,
    desc: "For growing celebrations",
    guests: 100,
    invitations: 100,
    features: MARKETING_FEATURES_BY_SLUG.growth,
    popular: true,
    slug: "growth",
  },
  {
    name: "Premium",
    price: "₵499",
    priceGhs: 499,
    desc: "Full event operating system",
    guests: 300,
    invitations: 300,
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
    invitations: 5000,
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
  // Guest capacity is shown in the card header + marketing "Guest list" line —
  // never append a second "Up to N guests" row here (it drifts when cache is stale).
  void p.guestLimit;
  const lines: string[] = [
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

  const marketingRaw = sanitizeFeatureLabels(
    MARKETING_FEATURES_BY_SLUG[p.slug] ??
      MARKETING_FEATURES_BY_SLUG[p.name.toLowerCase()] ??
      FALLBACK_PLANS.find((f) => f.slug === p.slug)?.features ??
      []
  );
  // Keep marketing guest-capacity and invitation-send lines in sync with package quotas.
  const marketing = marketingRaw.map((line) => {
    if (/guest list \(up to .+\)/i.test(line)) {
      return `Guest list (up to ${p.guestLimit.toLocaleString()})`;
    }
    if (/invitation sends?/i.test(line)) {
      return `${p.invitationLimit.toLocaleString()} invitation sends`;
    }
    return line;
  });

  const quotas = buildQuotaFeatures(p);
  const marketingMentionsGuests = marketing.some((line) => /guest/i.test(line));
  const quotaLines = marketingMentionsGuests
    ? quotas.filter((line) => !/^up to .+ guests$/i.test(line))
    : quotas;

  // Marketing copy first so every tier always shows clear service details.
  // Fall back to catalog labels for unknown slugs; keep quotas as capacity cues.
  const merged: string[] = [];
  const seen = new Set<string>();
  const sources =
    marketing.length > 0
      ? [...marketing, ...quotaLines]
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
    name: Number(p.price) === 0 && p.slug === "starter" ? "Free" : p.name,
    priceGhs: Number(p.price),
    price: Number(p.price) === 0 ? "Free" : formatCurrency(Number(p.price), p.currency),
    desc: p.description?.trim() || FALLBACK_PLANS.find((f) => f.slug === p.slug)?.desc || "Event package",
    guests: p.guestLimit,
    invitations: p.invitationLimit,
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
  ["active-pricing-plans-v14-enterprise-5k-tickets"],
  { revalidate: 60, tags: ["pricing-plans"] }
);
