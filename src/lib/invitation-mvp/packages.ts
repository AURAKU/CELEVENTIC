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
}

export const INVITATION_PACKAGES: InvitationPackageDef[] = [
  {
    slug: "starter",
    name: "Starter",
    description: "Perfect for intimate gatherings and quick digital invites",
    priceGhs: 0,
    revisions: 1,
    deliveryDays: 1,
    features: ["1 invitation design", "RSVP link", "Guest list (50)", "Basic template", "Share link"],
    designerAssist: false,
  },
  {
    slug: "celebration",
    name: "Celebration",
    description: "Beautiful invites for birthdays, engagements, and small weddings",
    priceGhs: 199,
    revisions: 2,
    deliveryDays: 2,
    features: ["Premium template", "RSVP + reminders", "Gallery (10 images)", "Countdown", "Maps & directions", "Guest list (150)"],
    designerAssist: false,
  },
  {
    slug: "signature",
    name: "Signature",
    description: "Our most popular wedding and funeral experience package",
    priceGhs: 499,
    revisions: 3,
    deliveryDays: 3,
    features: ["Luxury template", "Personalized guest links", "QR admission", "Music preference", "Gallery (30)", "Designer review", "Guest list (500)"],
    designerAssist: true,
  },
  {
    slug: "prestige",
    name: "Prestige",
    description: "Full production with designer-assisted polish",
    priceGhs: 999,
    revisions: 5,
    deliveryDays: 5,
    features: ["Bespoke styling", "Designer-assisted production", "Revision workflow", "Priority delivery", "Guest list (1000)", "Add-ons included"],
    designerAssist: true,
  },
  {
    slug: "bespoke",
    name: "Bespoke",
    description: "White-glove custom invitation experience",
    priceGhs: 2499,
    revisions: 10,
    deliveryDays: 7,
    features: ["Fully custom design", "Dedicated designer", "Unlimited sections", "Lifetime archive", "VIP support", "Multi-language ready"],
    designerAssist: true,
  },
];

export function getInvitationPackage(slug: string) {
  return INVITATION_PACKAGES.find((p) => p.slug === slug);
}

export function calculateOrderTotal(packageSlug: string, addonSlugs: string[]) {
  const pkg = getInvitationPackage(packageSlug);
  if (!pkg) return 0;
  const addonTotal = addonSlugs.reduce((sum, slug) => {
    const addon = INVITATION_ADDONS.find((a) => a.slug === slug);
    return sum + (addon?.priceGhs ?? 0);
  }, 0);
  return pkg.priceGhs + addonTotal;
}
