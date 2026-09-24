import { INVITATION_ADDONS } from "./addons";

export interface InvitationPackageDef {
  slug: string;
  name: string;
  description: string;
  priceGhs: number;
  revisions: number;
  deliveryDays: number;
  features: string[];
  designerAssist: boolean;
  /** Null/empty means available for every event type. */
  eventTypes?: string[] | null;
  /** Invitation guest entitlement (digital). Never use admission-staff capacity here. */
  guestCapacity?: number;
  /** On-ground admission team coverage. Independent of guestCapacity. */
  admissionSupportGuests?: number | null;
  includedStaff?: number | null;
  includedSupportHours?: number | null;
  /** Show "From" before the price (quotation floor, not a cap). */
  priceFrom?: boolean;
  popular?: boolean;
  /** Skip Paystack; contact / quotation only. */
  quoteOnly?: boolean;
  catalogVisible?: boolean;
  ctaLabel?: string;
  paymentRequiredToPublish?: boolean;
  includesLabel?: string | null;
}

export const INVITATION_PACKAGE_ADDITIONAL_CHARGES =
  "Additional staffing, extra event hours, travel/logistics and custom requests are quoted separately.";

const STARTER_FEATURES = [
  "Custom digital invitation setup",
  "Event details, venue & map",
  "RSVP collection",
  "Guest list support",
  "Shareable invitation link",
  "Up to 75 guests",
  "1 revision",
];

const CLASSIC_FEATURES = [
  "Everything in Starter",
  "Premium template selection",
  "Countdown & event schedule",
  "Background music",
  "Photo gallery section",
  "QR guest access",
  "Up to 150 guests",
  "2 revisions",
];

const SIGNATURE_FEATURES = [
  "Everything in Classic",
  "Interactive invitation experience",
  "Premium animations & reveal effects",
  "Personalized QR guest passes",
  "Memory Vault guest uploads",
  "Thank-you page / post-event experience",
  "Up to 300 guests",
  "3 revisions",
];

const ULTIMATE_FEATURES = [
  "Everything in Signature",
  "Full designer-assisted setup",
  "RSVP monitoring support",
  "QR admission setup",
  "Event-day admission team included",
  "2 staff members",
  "Up to 4 hours of event-day support",
  "On-ground admission support for up to 200 guests",
];

/**
 * Canonical invitation packages (flyer).
 *
 * Slugs stay stable for existing orders:
 * - Classic is stored as `celebration`
 * - Ultimate Experience is stored as `bespoke`
 * Prestige remains in the catalogue as a hidden legacy SKU.
 */
export const INVITATION_PACKAGES: InvitationPackageDef[] = [
  {
    slug: "starter",
    name: "Starter",
    description: "Beautifully invited",
    priceGhs: 450,
    revisions: 1,
    deliveryDays: 2,
    features: STARTER_FEATURES,
    designerAssist: false,
    guestCapacity: 75,
    popular: false,
    quoteOnly: false,
    catalogVisible: true,
    ctaLabel: "Get started",
    paymentRequiredToPublish: true,
    includesLabel: null,
  },
  {
    slug: "celebration",
    name: "Classic",
    description: "Everything your guests need",
    priceGhs: 800,
    revisions: 2,
    deliveryDays: 3,
    features: CLASSIC_FEATURES,
    designerAssist: false,
    guestCapacity: 150,
    popular: false,
    quoteOnly: false,
    catalogVisible: true,
    ctaLabel: "Choose Classic",
    paymentRequiredToPublish: true,
    includesLabel: "Everything in Starter",
  },
  {
    slug: "signature",
    name: "Signature",
    description: "An invitation they will remember",
    priceGhs: 1500,
    revisions: 3,
    deliveryDays: 4,
    features: SIGNATURE_FEATURES,
    designerAssist: true,
    guestCapacity: 300,
    popular: true,
    quoteOnly: false,
    catalogVisible: true,
    ctaLabel: "Choose Signature",
    paymentRequiredToPublish: true,
    includesLabel: "Everything in Classic",
  },
  {
    slug: "bespoke",
    name: "Ultimate Experience",
    description: "From invitation to admission",
    priceGhs: 2950,
    revisions: 3,
    deliveryDays: 7,
    features: ULTIMATE_FEATURES,
    designerAssist: true,
    guestCapacity: 300,
    admissionSupportGuests: 200,
    includedStaff: 2,
    includedSupportHours: 4,
    priceFrom: true,
    popular: false,
    quoteOnly: true,
    catalogVisible: true,
    ctaLabel: "Contact us",
    paymentRequiredToPublish: true,
    includesLabel: "Everything in Signature",
  },
  {
    slug: "prestige",
    name: "Prestige",
    description: "Legacy luxury invitation package",
    priceGhs: 999,
    revisions: 5,
    deliveryDays: 5,
    features: [
      "Everything in Signature",
      "Designer-assisted customization",
      "Priority support",
    ],
    designerAssist: true,
    guestCapacity: 300,
    catalogVisible: false,
    quoteOnly: false,
    paymentRequiredToPublish: true,
  },
];

const PACKAGE_SLUG_ALIASES: Record<string, string> = {
  classic: "celebration",
  ultimate: "bespoke",
  "ultimate-experience": "bespoke",
  essential: "starter",
};

export function resolveInvitationPackageSlug(slug?: string | null): string | null {
  if (!slug) return null;
  const trimmed = slug.trim().toLowerCase();
  return PACKAGE_SLUG_ALIASES[trimmed] ?? trimmed;
}

export function getInvitationPackage(slug: string): InvitationPackageDef | undefined {
  const canonical = resolveInvitationPackageSlug(slug);
  if (!canonical) return undefined;
  return INVITATION_PACKAGES.find((pkg) => pkg.slug === canonical);
}

export function getCatalogInvitationPackages(): InvitationPackageDef[] {
  return INVITATION_PACKAGES.filter((pkg) => pkg.catalogVisible !== false);
}

export function isQuoteOnlyInvitationPackage(slug: string): boolean {
  return getInvitationPackage(slug)?.quoteOnly === true;
}

export function isPopularInvitationPackage(slug: string): boolean {
  return getInvitationPackage(slug)?.popular === true;
}

/** GHS major units → pesewas (Paystack smallest unit). */
export function ghsToPesewas(amountGhs: number): number {
  return Math.round(amountGhs * 100);
}

export function formatInvitationPriceGhs(pkg: Pick<InvitationPackageDef, "priceGhs" | "priceFrom">): string {
  const amount = `GHS ${pkg.priceGhs.toLocaleString("en-US")}`;
  return pkg.priceFrom ? `From ${amount}` : amount;
}

export function invitationPackageContactMessage(pkg: InvitationPackageDef): string {
  return `Hello Celeventic — I would like a quotation for the ${pkg.name} invitation package (${formatInvitationPriceGhs(pkg)}).`;
}

export function calculateOrderTotal(packageSlug: string, addonSlugs: string[]) {
  const pkg = getInvitationPackage(packageSlug);
  if (!pkg) return 0;
  if (pkg.quoteOnly) return 0;
  const addonTotal = addonSlugs.reduce((sum, slug) => {
    const addon = INVITATION_ADDONS.find((item) => item.slug === slug);
    return sum + (addon?.priceGhs ?? 0);
  }, 0);
  return pkg.priceGhs + addonTotal;
}
