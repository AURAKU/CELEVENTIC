import { prisma } from "@/lib/prisma";
import { currencyService } from "@/services/commerce/currency.service";
import { INVITATION_PACKAGES } from "@/lib/invitation-mvp/packages";

const ALL_EVENTS = [
  "WEDDING",
  "ENGAGEMENT",
  "BIRTHDAY",
  "FUNERAL",
  "CONFERENCE",
  "CORPORATE_EVENT",
  "CONCERT",
  "FESTIVAL",
  "GRADUATION",
  "BABY_SHOWER",
  "PRIVATE_PARTY",
  "CUSTOM",
];

const CELEBRATION_EVENTS = [
  "WEDDING",
  "ENGAGEMENT",
  "BIRTHDAY",
  "GRADUATION",
  "BABY_SHOWER",
  "PRIVATE_PARTY",
  "CUSTOM",
];

const PREMIUM_EVENTS = [
  "WEDDING",
  "ENGAGEMENT",
  "FUNERAL",
  "CONFERENCE",
  "CORPORATE_EVENT",
  "CONCERT",
  "FESTIVAL",
];

const EVENT_TYPES_BY_SLUG: Record<string, string[]> = {
  starter: ALL_EVENTS,
  celebration: CELEBRATION_EVENTS,
  signature: PREMIUM_EVENTS,
  prestige: PREMIUM_EVENTS,
  bespoke: ALL_EVENTS,
};

const PACKAGES = INVITATION_PACKAGES.map((pkg) => ({
  slug: pkg.slug,
  name: pkg.name,
  tagline: pkg.description,
  bestFor: pkg.description,
  priceGhs: pkg.priceGhs,
  revisions: pkg.revisions,
  deliveryDays: pkg.deliveryDays,
  designerAssist: pkg.designerAssist,
  paymentRequiredToPublish: pkg.paymentRequiredToPublish !== false,
  eventTypes: EVENT_TYPES_BY_SLUG[pkg.slug] ?? ALL_EVENTS,
  features: pkg.features,
  isPopular: pkg.popular === true,
  isActive: pkg.catalogVisible !== false || pkg.slug === "prestige",
}));

const ADDONS = [
  { slug: "express-delivery", name: "Express Delivery", description: "Priority 24-hour production", category: "delivery", priceGhs: 149, deliveryImpactDays: -1, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "custom-music", name: "Custom Music", description: "Background music on invitation", category: "media", priceGhs: 99, deliveryImpactDays: 0, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "voice-intro", name: "Voice Intro", description: "Recorded voice welcome message", category: "media", priceGhs: 179, deliveryImpactDays: 1, eligibility: ["signature", "prestige", "bespoke"] },
  { slug: "custom-monogram", name: "Custom Monogram", description: "Personalized couple/event monogram", category: "design", priceGhs: 129, deliveryImpactDays: 1, eligibility: ["signature", "prestige", "bespoke"] },
  { slug: "custom-illustration", name: "Custom Illustration", description: "Bespoke illustrated elements", category: "design", priceGhs: 299, deliveryImpactDays: 2, eligibility: ["prestige", "bespoke"] },
  { slug: "extra-revision", name: "Extra Revision", description: "One additional revision round", category: "production", priceGhs: 79, deliveryImpactDays: 1, eligibility: ["starter", "celebration", "signature", "prestige"] },
  { slug: "duplicate-invitation", name: "Duplicate Invitation", description: "Second event variant (e.g. reception)", category: "production", priceGhs: 199, deliveryImpactDays: 2, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "multi-language", name: "Multi-language Version", description: "Additional language copy", category: "content", priceGhs: 149, deliveryImpactDays: 1, eligibility: ["signature", "prestige", "bespoke"] },
  { slug: "custom-domain", name: "Custom Domain", description: "yourname.celeventic.com or custom URL", category: "hosting", priceGhs: 399, deliveryImpactDays: 2, eligibility: ["prestige", "bespoke"] },
  { slug: "qr-checkin", name: "QR Guest Check-in", description: "QR admission scanning for guests", category: "access", priceGhs: 89, deliveryImpactDays: 0, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "whatsapp-bulk", name: "Bulk WhatsApp Invitation", description: "Mass WhatsApp distribution", category: "messaging", priceGhs: 129, deliveryImpactDays: 0, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "seating-plan", name: "Seating Plan", description: "Digital seating arrangement module", category: "planning", priceGhs: 199, deliveryImpactDays: 2, eligibility: ["signature", "prestige", "bespoke"] },
  { slug: "gift-registry", name: "Gift Registry", description: "Linked gift registry section", category: "content", priceGhs: 99, deliveryImpactDays: 1, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "memory-vault", name: "Memory Vault", description: "Lifetime photo archive for event", category: "archive", priceGhs: 249, deliveryImpactDays: 0, eligibility: ["signature", "prestige", "bespoke"] },
  { slug: "video-intro", name: "Video Intro", description: "Hosted video welcome section", category: "media", priceGhs: 199, deliveryImpactDays: 1, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "extra-gallery", name: "Extra Gallery Storage", description: "50 additional gallery images", category: "media", priceGhs: 59, deliveryImpactDays: 0, eligibility: ["celebration", "signature", "prestige", "bespoke"] },
  { slug: "ai-content-assist", name: "Celeventic Content Intelligence", description: "AGI Engine-crafted invitation structure and copy", category: "experience", priceGhs: 79, deliveryImpactDays: 0, eligibility: ["starter", "celebration", "signature", "prestige", "bespoke"] },
];

export async function seedCommerceEngine() {
  await currencyService.ensureCurrenciesSeeded();

  for (let i = 0; i < PACKAGES.length; i++) {
    const p = PACKAGES[i];
    const pkg = await prisma.invitationProductPackage.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        tagline: p.tagline,
        bestFor: p.bestFor,
        priceGhs: p.priceGhs,
        revisions: p.revisions,
        deliveryDays: p.deliveryDays,
        features: p.features,
        eventTypes: p.eventTypes,
        designerAssist: p.designerAssist,
        paymentRequiredToPublish: p.paymentRequiredToPublish,
        isPopular: p.isPopular,
        isActive: p.isActive,
        sortOrder: i,
      },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.tagline,
        tagline: p.tagline,
        bestFor: p.bestFor,
        priceGhs: p.priceGhs,
        revisions: p.revisions,
        deliveryDays: p.deliveryDays,
        features: p.features,
        eventTypes: p.eventTypes,
        designerAssist: p.designerAssist,
        paymentRequiredToPublish: p.paymentRequiredToPublish,
        isPopular: p.isPopular,
        isActive: p.isActive,
        sortOrder: i,
      },
    });
    const existingPrice = await prisma.packagePrice.findFirst({
      where: { packageId: pkg.id, isActive: true },
    });
    if (!existingPrice) {
      await prisma.packagePrice.create({
        data: { packageId: pkg.id, amountGhs: p.priceGhs, isActive: true },
      });
    } else if (Number(existingPrice.amountGhs) !== p.priceGhs) {
      await prisma.packagePrice.update({
        where: { id: existingPrice.id },
        data: { amountGhs: p.priceGhs },
      });
    }
  }

  for (const a of ADDONS) {
    await prisma.invitationAddon.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        description: a.description,
        category: a.category,
        priceGhs: a.priceGhs,
        deliveryImpactDays: a.deliveryImpactDays,
        packageEligibility: a.eligibility,
      },
      create: {
        slug: a.slug,
        name: a.name,
        description: a.description,
        category: a.category,
        priceGhs: a.priceGhs,
        deliveryImpactDays: a.deliveryImpactDays,
        packageEligibility: a.eligibility,
      },
    });
  }
}
