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
  /** Honest Free-plan locks. Shown with lock icons to pull upgrades. */
  restrictions?: string[];
  /** One-line value contrast vs Free (paid plans). */
  highlight?: string;
  footnote?: string;
  cta?: string;
  popular: boolean;
  slug: string;
  isTrial?: boolean;
};

type PlanMarketing = {
  desc: string;
  features: string[];
  restrictions?: string[];
  highlight?: string;
  footnote?: string;
  cta?: string;
  isTrial?: boolean;
};

/**
 * Conversion copy for the public pricing grid.
 * Free is a 5-person tasting with hard locks; paid plans sell the real event.
 */
const PLAN_MARKETING: {
  starter: PlanMarketing;
  growth: PlanMarketing;
  premium: PlanMarketing;
  enterprise: PlanMarketing;
} = {
  starter: {
    isTrial: true,
    desc: "Taste Celeventic with 5 people. Real celebrations upgrade.",
    highlight: "Capped at 5. On purpose",
    features: [
      "5 guest seats only",
      "5 invitation sends only",
      "Basic templates",
      "RSVP for those 5 guests",
      "QR admission for those 5",
    ],
    restrictions: [
      "Ticketing or paid entry",
      "WhatsApp, SMS, or bulk campaigns",
      "Seating charts or Memory Vault",
      "Premium cinematic templates",
      "Analytics, vendors, or collaborators",
      "Removing the Celeventic mark from invites",
    ],
    footnote: "Free is a tasting menu. The wedding, funeral, or launch runs on a paid plan.",
    cta: "Start the 5-guest trial",
  },
  growth: {
    desc: "The plan hosts choose once the guest list is real.",
    highlight: "20× more guests than Free",
    features: [
      "Everything Free locks. Unlocked",
      "100 guests and 100 invitation sends",
      "Ticketing and ticket QR",
      "WhatsApp, SMS, and email credits",
      "Custom themes and seating",
      "Event communications",
    ],
    footnote: "From a 5-person trial to a full celebration. In one upgrade.",
    cta: "Unlock Growth",
  },
  premium: {
    desc: "The full event operating system for the day itself.",
    highlight: "Memory Vault, marketplace, and 300 guests",
    features: [
      "Everything in Growth",
      "300 guests and 300 invitation sends",
      "Seating, Memory Vault, and offline QR",
      "Vendor marketplace access",
      "Digital business card (QR + NFC)",
      "Analytics and collaboration",
    ],
    footnote: "Run invitations, door, vendors, and memories in one place.",
    cta: "Get Premium",
  },
  enterprise: {
    desc: "White-glove scale for organisations that never cap the room.",
    highlight: "5,000 guests · dedicated success",
    features: [
      "Everything in Premium",
      "Unlimited-scale guest capacity",
      "Priority support and a success manager",
      "Advanced messaging credits",
      "White-label ready workflow",
      "Team digital business cards",
    ],
    footnote: "For groups, hotels, and houses that run Celeventic as infrastructure.",
    cta: "Talk to us",
  },
};

const MARKETING_FEATURES_BY_SLUG: Record<string, string[]> = {
  starter: PLAN_MARKETING.starter.features,
  growth: PLAN_MARKETING.growth.features,
  premium: PLAN_MARKETING.premium.features,
  enterprise: PLAN_MARKETING.enterprise.features,
};

const FALLBACK_PLANS: PricingPlan[] = [
  {
    name: "Free",
    price: "Free",
    priceGhs: 0,
    desc: PLAN_MARKETING.starter.desc,
    guests: 5,
    invitations: 5,
    features: PLAN_MARKETING.starter.features,
    restrictions: PLAN_MARKETING.starter.restrictions,
    highlight: PLAN_MARKETING.starter.highlight,
    footnote: PLAN_MARKETING.starter.footnote,
    cta: PLAN_MARKETING.starter.cta,
    popular: false,
    slug: "starter",
    isTrial: true,
  },
  {
    name: "Growth",
    price: "₵299",
    priceGhs: 299,
    desc: PLAN_MARKETING.growth.desc,
    guests: 100,
    invitations: 100,
    features: PLAN_MARKETING.growth.features,
    highlight: PLAN_MARKETING.growth.highlight,
    footnote: PLAN_MARKETING.growth.footnote,
    cta: PLAN_MARKETING.growth.cta,
    popular: true,
    slug: "growth",
  },
  {
    name: "Premium",
    price: "₵499",
    priceGhs: 499,
    desc: PLAN_MARKETING.premium.desc,
    guests: 300,
    invitations: 300,
    features: PLAN_MARKETING.premium.features,
    highlight: PLAN_MARKETING.premium.highlight,
    footnote: PLAN_MARKETING.premium.footnote,
    cta: PLAN_MARKETING.premium.cta,
    popular: false,
    slug: "premium",
  },
  {
    name: "Enterprise",
    price: "₵1,499",
    priceGhs: 1499,
    desc: PLAN_MARKETING.enterprise.desc,
    guests: 5000,
    invitations: 5000,
    features: PLAN_MARKETING.enterprise.features,
    highlight: PLAN_MARKETING.enterprise.highlight,
    footnote: PLAN_MARKETING.enterprise.footnote,
    cta: PLAN_MARKETING.enterprise.cta,
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
  // Guest capacity is shown in the card header + marketing "Guest list" line.
  // never append a second "Up to N guests" row here (it drifts when cache is stale).
  void p.guestLimit;
  const lines: string[] = [];
  if (p.invitationLimit > 0) {
    lines.push(`${p.invitationLimit.toLocaleString()} invitation sends`);
  }
  if (p.ticketLimit > 0) {
    lines.push(`${p.ticketLimit.toLocaleString()} tickets`);
  }
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
  const marketingMentionsInvites = marketing.some((line) => /invitation/i.test(line));
  const quotaLines = quotas.filter((line) => {
    if (marketingMentionsGuests && /^up to .+ guests$/i.test(line)) return false;
    if (marketingMentionsInvites && /invitation sends?/i.test(line)) return false;
    return true;
  });

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

  return packages.map((p, i) => {
    const marketing = PLAN_MARKETING[p.slug as keyof typeof PLAN_MARKETING];
    const fallback = FALLBACK_PLANS.find((f) => f.slug === p.slug);
    const isFreeStarter = Number(p.price) === 0 && p.slug === "starter";
    return {
      name: isFreeStarter ? "Free" : p.name,
      priceGhs: Number(p.price),
      price: Number(p.price) === 0 ? "Free" : formatCurrency(Number(p.price), p.currency),
      desc: marketing?.desc || p.description?.trim() || fallback?.desc || "Event package",
      guests: isFreeStarter ? 5 : p.guestLimit,
      invitations: isFreeStarter ? 5 : p.invitationLimit,
      features: resolvePlanFeatures(p),
      restrictions: marketing?.restrictions ?? fallback?.restrictions,
      highlight: marketing?.highlight ?? fallback?.highlight,
      footnote: marketing?.footnote ?? fallback?.footnote,
      cta: marketing?.cta ?? fallback?.cta,
      popular: i === 1 || p.slug === "growth",
      slug: p.slug,
      isTrial: Boolean(marketing?.isTrial || isFreeStarter),
    };
  });
}

export const getActivePricingPlans = unstable_cache(
  async () => {
    try {
      const packages = await prisma.eventPackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          packageFeatures: { select: { featureKey: true, isIncluded: true } },
        },
      });
      return toPlans(packages);
    } catch (error) {
      console.warn("[packages] using fallback pricing plans", error);
      return FALLBACK_PLANS;
    }
  },
  ["active-pricing-plans-v16-trial-conversion"],
  { revalidate: 60, tags: ["pricing-plans"] }
);
