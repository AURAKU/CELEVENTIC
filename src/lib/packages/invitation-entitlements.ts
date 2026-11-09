import { ALL_FEATURE_KEYS, FeatureKey } from "@/lib/blueprints/feature-keys";
import { getInvitationPackage, resolveInvitationPackageSlug } from "@/lib/invitation-mvp/packages";

const CORE = [
  FeatureKey.OVERVIEW,
  FeatureKey.SETTINGS,
  FeatureKey.INVITATIONS,
  FeatureKey.GUEST_LIST,
  FeatureKey.RSVP,
  FeatureKey.VENUE,
  FeatureKey.QR_ADMISSION,
  FeatureKey.DESIGN_STUDIO,
];

const CLASSIC_KEYS = [
  ...CORE,
  FeatureKey.TIMELINE,
  FeatureKey.GALLERY,
  FeatureKey.COMMUNICATIONS,
  FeatureKey.DRESS_CODE,
  FeatureKey.COUPLE_PROFILE,
];

const SIGNATURE_KEYS = [
  ...CLASSIC_KEYS,
  FeatureKey.MEMORY_VAULT,
  FeatureKey.THANK_YOU,
  FeatureKey.SEATING,
  FeatureKey.ANALYTICS,
  FeatureKey.WEDDING_PARTY,
  FeatureKey.GIFT_LIST,
  FeatureKey.REGISTRY,
  FeatureKey.CONTRIBUTIONS,
  FeatureKey.TICKETING,
];

const ULTIMATE_KEYS = [
  ...SIGNATURE_KEYS,
  FeatureKey.COLLABORATORS,
  FeatureKey.STAFF_PASSES,
  FeatureKey.VIP_ACCESS,
  FeatureKey.EVENT_WALLET,
  FeatureKey.VENDORS,
];

/** Invitation catalogue slug → EventPackage slug used for quotas and feature gates. */
export const EVENT_PACKAGE_SLUG_FOR_INVITATION: Record<string, string> = {
  starter: "starter-paid",
  celebration: "celebration",
  signature: "signature",
  bespoke: "bespoke",
  customisation: "customisation",
  prestige: "signature",
};

export type EventPackageSpec = {
  slug: string;
  name: string;
  description: string;
  price: number;
  guestLimit: number;
  invitationLimit: number;
  ticketLimit: number;
  smsCredits: number;
  emailCredits: number;
  whatsappCredits: number;
  sortOrder: number;
  features: string[] | { all: true };
};

export const FLYER_EVENT_PACKAGE_SPECS: EventPackageSpec[] = [
  {
    slug: "starter-paid",
    name: "Starter",
    description: "Beautifully invited. Custom digital invitation for up to 75 guests.",
    price: 450,
    guestLimit: 75,
    invitationLimit: 75,
    ticketLimit: 0,
    smsCredits: 0,
    emailCredits: 75,
    whatsappCredits: 0,
    sortOrder: 10,
    features: CORE,
  },
  {
    slug: "celebration",
    name: "Classic",
    description: "Everything your guests need. Countdown, music, gallery, and QR access.",
    price: 800,
    guestLimit: 150,
    invitationLimit: 150,
    ticketLimit: 150,
    smsCredits: 50,
    emailCredits: 200,
    whatsappCredits: 25,
    sortOrder: 11,
    features: CLASSIC_KEYS,
  },
  {
    slug: "signature",
    name: "Signature",
    description: "An invitation they will remember. Memory Vault, thank-you page, 300 guests.",
    price: 1500,
    guestLimit: 300,
    invitationLimit: 300,
    ticketLimit: 300,
    smsCredits: 150,
    emailCredits: 500,
    whatsappCredits: 75,
    sortOrder: 12,
    features: SIGNATURE_KEYS,
  },
  {
    slug: "bespoke",
    name: "Ultimate Experience",
    description: "From invitation to admission. Designer setup and event-day team.",
    price: 2950,
    guestLimit: 300,
    invitationLimit: 300,
    ticketLimit: 500,
    smsCredits: 300,
    emailCredits: 1000,
    whatsappCredits: 150,
    sortOrder: 13,
    features: ULTIMATE_KEYS,
  },
  {
    slug: "customisation",
    name: "Customisation",
    description: "Celeventic team builds your template with every feature included.",
    price: 4500,
    guestLimit: 500,
    invitationLimit: 500,
    ticketLimit: 1000,
    smsCredits: 500,
    emailCredits: 2000,
    whatsappCredits: 250,
    sortOrder: 14,
    features: { all: true },
  },
];

const PLAN_RANK: Record<string, number> = {
  starter: 0,
  free: 0,
  "starter-paid": 1,
  growth: 1,
  celebration: 2,
  classic: 2,
  premium: 2,
  signature: 3,
  bespoke: 4,
  enterprise: 4,
  customisation: 5,
};

export function eventPackageSlugForInvitation(invitationSlug?: string | null): string | null {
  const canonical = resolveInvitationPackageSlug(invitationSlug);
  if (!canonical) return null;
  return EVENT_PACKAGE_SLUG_FOR_INVITATION[canonical] ?? null;
}

export function eventPackageSpecForInvitation(invitationSlug?: string | null): EventPackageSpec | null {
  const eventSlug = eventPackageSlugForInvitation(invitationSlug);
  if (!eventSlug) return null;
  return FLYER_EVENT_PACKAGE_SPECS.find((spec) => spec.slug === eventSlug) ?? null;
}

export function planRank(slug?: string | null): number {
  if (!slug) return 0;
  return PLAN_RANK[slug] ?? 0;
}

export function isUpgrade(fromSlug: string | null | undefined, toSlug: string): boolean {
  return planRank(toSlug) > planRank(fromSlug);
}

export function publicBillingSlugs(): string[] {
  return ["starter", ...FLYER_EVENT_PACKAGE_SPECS.map((s) => s.slug)];
}

export const FLYER_FEATURE_PILLS = [
  "Custom Digital Invitations",
  "RSVP Tracking",
  "Guest List Management",
  "Event Schedule & Countdown",
  "Music, Animation & Interactive Effects",
  "QR Guest Access & Admission",
  "Memory Vault Photo Uploads",
  "Thank-You Page / Post-Event Experience",
] as const;

export function invitationGuestLimit(invitationSlug?: string | null): number {
  const pkg = getInvitationPackage(invitationSlug ?? "");
  return pkg?.guestCapacity ?? eventPackageSpecForInvitation(invitationSlug)?.guestLimit ?? 5;
}

export function customisationFeatureKeys(): string[] {
  return [...ALL_FEATURE_KEYS];
}
