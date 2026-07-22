import { prisma } from "@/lib/prisma";
import { currencyService } from "@/services/commerce/currency.service";

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

const PACKAGES = [
  {
    slug: "starter",
    name: "Essential",
    tagline: "Best for simple events",
    bestFor: "Simple gatherings, quick digital invites",
    priceGhs: 0,
    revisions: 1,
    deliveryDays: 1,
    designerAssist: false,
    paymentRequiredToPublish: false,
    eventTypes: ALL_EVENTS,
    features: [
      "Digital invitation link",
      "Basic RSVP",
      "Maps & calendar",
      "Core sections",
      "1 revision",
    ],
  },
  {
    slug: "celebration",
    name: "Premium",
    tagline: "Best for weddings, birthdays, family events",
    bestFor: "Weddings, birthdays, family celebrations",
    priceGhs: 199,
    revisions: 2,
    deliveryDays: 2,
    designerAssist: false,
    paymentRequiredToPublish: true,
    eventTypes: CELEBRATION_EVENTS,
    features: [
      "Everything in Essential",
      "Animated intro",
      "Photo story & gallery",
      "Travel and stay",
      "Dress code & menu",
      "2 revisions",
    ],
  },
  {
    slug: "signature",
    name: "Signature",
    tagline: "Best for premium weddings and formal events",
    bestFor: "Premium weddings, formal events",
    priceGhs: 499,
    revisions: 3,
    deliveryDays: 3,
    designerAssist: true,
    paymentRequiredToPublish: true,
    eventTypes: PREMIUM_EVENTS,
    features: [
      "Everything in Premium",
      "Custom monogram option",
      "Custom illustration option",
      "QR guest pass",
      "Custom domain option",
      "3 revisions",
    ],
  },
  {
    slug: "prestige",
    name: "Prestige",
    tagline: "Best for luxury celebrations",
    bestFor: "Luxury weddings and high-end events",
    priceGhs: 999,
    revisions: 5,
    deliveryDays: 5,
    designerAssist: true,
    paymentRequiredToPublish: true,
    eventTypes: PREMIUM_EVENTS,
    features: [
      "Everything in Signature",
      "Designer-assisted customization",
      "Advanced gallery & video",
      "Multi-language invitation",
      "Priority support",
      "Extended Memory Vault",
    ],
  },
  {
    slug: "bespoke",
    name: "Bespoke",
    tagline: "Custom pricing",
    bestFor: "Fully custom luxury experiences",
    priceGhs: 2499,
    revisions: 10,
    deliveryDays: 7,
    designerAssist: true,
    paymentRequiredToPublish: true,
    eventTypes: ALL_EVENTS,
    features: [
      "Fully custom invitation",
      "Advanced animation",
      "Custom illustration",
      "Custom domain",
      "Dedicated designer",
      "Full collaborator access",
    ],
  },
];

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
