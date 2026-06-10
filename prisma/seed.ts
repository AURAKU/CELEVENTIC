import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCommerceEngine } from "../src/services/commerce/commerce-seed.service";
import { translationService } from "../src/services/i18n/translation.service";
import { invitationBlockService } from "../src/services/invitations/invitation-block.service";
import { seedVendorOs } from "../src/services/vendor-os/vendor-os-seed.service";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@celeventic.com" },
    update: {},
    create: {
      email: "admin@celeventic.com",
      name: "Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isVerified: true,
      emailVerified: new Date(),
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@celeventic.com" },
    update: {},
    create: {
      email: "organizer@celeventic.com",
      name: "Demo Organizer",
      passwordHash: await bcrypt.hash("Organizer@123", 12),
      role: UserRole.ORGANIZER,
      isVerified: true,
      emailVerified: new Date(),
    },
  });

  const packages = [
    {
      name: "Starter",
      slug: "starter",
      description: "Perfect for intimate gatherings",
      price: 0,
      guestLimit: 50,
      invitationLimit: 25,
      ticketLimit: 100,
      smsCredits: 10,
      emailCredits: 50,
      whatsappCredits: 0,
      sortOrder: 1,
      features: { qrAdmission: true, rsvp: true, basicTemplates: true },
    },
    {
      name: "Growth",
      slug: "growth",
      description: "For growing events and celebrations",
      price: 199,
      guestLimit: 200,
      invitationLimit: 150,
      ticketLimit: 500,
      smsCredits: 100,
      emailCredits: 500,
      whatsappCredits: 50,
      sortOrder: 2,
      features: { qrAdmission: true, rsvp: true, ticketing: true, campaigns: true },
    },
    {
      name: "Premium",
      slug: "premium",
      description: "Full-featured event operating system",
      price: 499,
      guestLimit: 1000,
      invitationLimit: 1000,
      ticketLimit: 5000,
      smsCredits: 500,
      emailCredits: 2000,
      whatsappCredits: 200,
      sortOrder: 3,
      features: { all: true },
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Unlimited scale for large organizations",
      price: 1499,
      guestLimit: 5000,
      invitationLimit: 5000,
      ticketLimit: 50000,
      smsCredits: 5000,
      emailCredits: 10000,
      whatsappCredits: 2000,
      sortOrder: 4,
      features: { all: true, whiteLabel: true, prioritySupport: true },
    },
  ];

  for (const pkg of packages) {
    await prisma.eventPackage.upsert({
      where: { slug: pkg.slug },
      update: pkg,
      create: pkg,
    });
  }

  const templates = [
    { name: "Classic Gold Frame", slug: "classic-gold", category: "wedding", config: { layout: "classic-gold", primary: "#B89E67", secondary: "#D4AF37" } },
    { name: "Arch & Vine", slug: "arch-green", category: "wedding", config: { layout: "arch-green", primary: "#1B3022", secondary: "#F5F0E6" } },
    { name: "Rustic Lace", slug: "rustic-lace", category: "wedding", config: { layout: "rustic-lace", primary: "#3D2314", secondary: "#FFFFFF" } },
    { name: "Boho Hexagon", slug: "boho-hexagon", category: "wedding", config: { layout: "boho-hexagon", primary: "#B89E67", secondary: "#D4A5A5" } },
    { name: "Luxury Rings", slug: "luxury-rings", category: "wedding", config: { layout: "luxury-rings", primary: "#D4AF37", secondary: "#0a0a0a" } },
    { name: "Elegant Teal", slug: "elegant-teal", category: "general", config: { layout: "classic-gold", primary: "#0D9488", secondary: "#D4AF37" } },
    { name: "Modern Minimal", slug: "modern-minimal", category: "corporate", config: { layout: "classic-gold", primary: "#0F766E", secondary: "#F5F5F5" } },
    { name: "Traditional Kente", slug: "traditional-kente", category: "cultural", config: { layout: "rustic-lace", primary: "#B45309", secondary: "#0D9488" } },
    { name: "Funeral Dignity", slug: "funeral-dignity", category: "funeral", config: { layout: "arch-green", primary: "#374151", secondary: "#9CA3AF" } },
  ];

  for (const template of templates) {
    await prisma.eventTemplate.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
  }

  const settings = [
    { key: "services.invitations", value: { enabled: true }, category: "services" },
    { key: "services.ticketing", value: { enabled: true }, category: "services" },
    { key: "services.qr_admission", value: { enabled: true }, category: "services" },
    { key: "services.communications", value: { enabled: true }, category: "services" },
    { key: "services.vendor_marketplace", value: { enabled: true }, category: "services" },
    { key: "services.advertising", value: { enabled: false }, category: "services" },
    { key: "services.funeral_os", value: { enabled: true }, category: "services" },
    { key: "services.wedding_os", value: { enabled: true }, category: "services" },
    { key: "services.corporate_os", value: { enabled: true }, category: "services" },
    { key: "pricing.sms_per_guest", value: { price: 0.15 }, category: "pricing" },
    { key: "pricing.whatsapp_per_guest", value: { price: 0.25 }, category: "pricing" },
    { key: "pricing.email_per_guest", value: { price: 0.05 }, category: "pricing" },
    { key: "pricing.ticket_commission", value: { percent: 5 }, category: "pricing" },
  ];

  for (const setting of settings) {
    await prisma.adminSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  const guestTiers = [50, 100, 150, 200, 500, 1000, 5000];

  const sampleVendors = [
    { businessName: "Golden Spoon Catering", category: "Catering", location: "Accra", rating: 4.8, isVerified: true, service: { name: "Full Wedding Package", priceFrom: 5000 } },
    { businessName: "Rhythm DJ Services", category: "DJ", location: "Kumasi", rating: 4.6, isVerified: true, service: { name: "Event DJ + Sound", priceFrom: 1500 } },
    { businessName: "Lens & Light Photography", category: "Photography", location: "Accra", rating: 4.9, isVerified: true, service: { name: "Wedding Photography", priceFrom: 3000 } },
    { businessName: "Bloom Floral Studio", category: "Decoration", location: "Tema", rating: 4.5, isVerified: false, service: { name: "Floral Arrangements", priceFrom: 800 } },
  ];

  for (const v of sampleVendors) {
    const existing = await prisma.vendor.findFirst({ where: { businessName: v.businessName } });
    if (!existing) {
      await prisma.vendor.create({
        data: {
          userId: organizer.id,
          slug: slugify(v.businessName),
          businessName: v.businessName,
          category: v.category,
          location: v.location,
          city: v.location,
          rating: v.rating,
          isVerified: v.isVerified,
          verificationStatus: v.isVerified ? "APPROVED" : "NOT_VERIFIED",
          services: { create: [{ name: v.service.name, priceFrom: v.service.priceFrom }] },
        },
      });
    }
  }

  const sampleVenues = [
    { name: "Royal Palm Events Centre", capacity: 500, location: "East Legon, Accra", priceFrom: 15000, priceTo: 25000 },
    { name: "Garden Terrace Hall", capacity: 200, location: "Cantonments, Accra", priceFrom: 8000, priceTo: 12000 },
    { name: "Kumasi Cultural Centre", capacity: 350, location: "Kumasi", priceFrom: 10000, priceTo: 18000 },
  ];

  for (const venue of sampleVenues) {
    const existing = await prisma.venue.findFirst({ where: { name: venue.name } });
    if (!existing) {
      await prisma.venue.create({ data: venue });
    }
  }

  // Design Template Intelligence Engine seed
  const designTemplateSchemas = [
    { slug: "luxury-wedding-invite", schema: { name: "Luxury Wedding Invitation", category: "Wedding", style: "Luxury", productType: "INVITATION", isPremium: false, isFeatured: true, themePreset: "luxury-teal-gold" } },
    { slug: "funeral-memorial", schema: { name: "Funeral Classic Memorial", category: "Funeral", style: "Classic", productType: "INVITATION", isPremium: false, themePreset: "funeral-classic" } },
    { slug: "corporate-conference-flyer", schema: { name: "Corporate Conference Flyer", category: "Corporate", style: "Corporate", productType: "FLYER", isPremium: false, themePreset: "corporate-navy" } },
    { slug: "premium-event-ticket", schema: { name: "Premium Event Ticket", category: "Ticket", style: "Modern", productType: "TICKET", isPremium: true, price: 29, themePreset: "luxury-teal-gold" } },
    { slug: "elegant-business-card", schema: { name: "Elegant Business Card", category: "Business Card", style: "Minimal", productType: "BUSINESS_CARD", isPremium: false, themePreset: "clean-white-gold" } },
    { slug: "kente-wedding-royal", schema: { name: "Traditional Kente Wedding", category: "Wedding", style: "Traditional Ghanaian", productType: "INVITATION", isPremium: true, price: 49, isFeatured: true, themePreset: "traditional-kente" } },
    { slug: "birthday-color-pop", schema: { name: "Birthday Celebration", category: "Birthday", style: "Modern", productType: "FLYER", isPremium: false, themePreset: "birthday-pop" } },
    { slug: "church-purple-gold", schema: { name: "Church Event Invitation", category: "Church", style: "Royal", productType: "INVITATION", isPremium: false, themePreset: "church-purple" } },
  ];

  const { SCHEMA_BY_NAME } = await import("../src/lib/default-template-schemas");

  for (const item of designTemplateSchemas) {
    const existing = await prisma.designTemplate.findUnique({ where: { slug: item.slug } });
    if (existing) continue;
    const baseSchema = SCHEMA_BY_NAME[item.schema.name];
    if (!baseSchema) continue;
    await prisma.designTemplate.create({
      data: {
        slug: item.slug,
        name: item.schema.name,
        description: `${item.schema.style} ${item.schema.category} template`,
        productType: item.schema.productType as never,
        category: item.schema.category,
        style: item.schema.style,
        themePreset: item.schema.themePreset,
        colorPalette: (baseSchema.colorPalette ?? {}) as Prisma.InputJsonValue,
        fontPairing: (baseSchema.fontPairing ?? {}) as Prisma.InputJsonValue,
        layoutType: item.schema.style,
        canvas: baseSchema.canvas as unknown as Prisma.InputJsonValue,
        blocks: baseSchema.blocks as unknown as Prisma.InputJsonValue,
        variables: (baseSchema.variables ?? []) as Prisma.InputJsonValue,
        isPremium: item.schema.isPremium ?? false,
        price: item.schema.price ?? 0,
        isFeatured: item.schema.isFeatured ?? false,
        supportsQr: true,
        supportsRsvp: true,
        supportsPersonalization: true,
        createdById: superAdmin.id,
        approvalStatus: "APPROVED",
      },
    });
  }

  const palettes = [
    { slug: "luxury-teal-gold", name: "Luxury Teal Gold", colors: ["#0D9488", "#D4AF37", "#0F766E", "#FFFFFF"], category: "Wedding" },
    { slug: "royal-black-gold", name: "Royal Black Gold", colors: ["#D4AF37", "#1a1a1a", "#0a0a0a", "#F5F5F5"], category: "Wedding" },
    { slug: "traditional-kente", name: "Traditional Kente", colors: ["#B45309", "#0D9488", "#FEF3C7", "#1a1a1a"], category: "Cultural" },
  ];
  for (const p of palettes) {
    await prisma.colorPalette.upsert({
      where: { slug: p.slug },
      update: { colors: p.colors },
      create: { slug: p.slug, name: p.name, colors: p.colors, category: p.category },
    });
  }

  const fonts = [
    { name: "Playfair Display", family: "Playfair Display", category: "Serif" },
    { name: "Cinzel", family: "Cinzel", category: "Serif" },
    { name: "Great Vibes", family: "Great Vibes", category: "Script" },
    { name: "Cormorant Garamond", family: "Cormorant Garamond", category: "Serif" },
    { name: "Inter", family: "Inter", category: "Sans" },
  ];
  for (const f of fonts) {
    const existing = await prisma.fontAsset.findFirst({ where: { family: f.family } });
    if (!existing) await prisma.fontAsset.create({ data: f });
  }

  const templateAssets = [
    { name: "Gold Decorative Frame", type: "FRAME" as const, category: "Wedding", url: "/assets/frames/gold-frame.svg", isPremium: false },
    { name: "Kente Pattern Band", type: "KENTE" as const, category: "Cultural", url: "/assets/patterns/kente-band.svg", isPremium: false },
    { name: "Adinkra Gye Nyame", type: "ADINKRA" as const, category: "Cultural", url: "/assets/patterns/adinkra-gye-nyame.svg", isPremium: false },
    { name: "Floral Corner Accent", type: "FLORAL" as const, category: "Wedding", url: "/assets/patterns/floral-corner.svg", isPremium: false },
    { name: "Gold QR Frame", type: "QR_FRAME" as const, category: "General", url: "/assets/frames/qr-gold.svg", isPremium: false },
    { name: "Ticket Pass Shape", type: "TICKET_SHAPE" as const, category: "Ticket", url: "/assets/shapes/ticket-notch.svg", isPremium: false },
  ];
  for (const asset of templateAssets) {
    const existing = await prisma.templateAsset.findFirst({ where: { name: asset.name } });
    if (!existing) await prisma.templateAsset.create({ data: { ...asset, isActive: true } });
  }

  console.log("Seed completed:");
  console.log(`  Super Admin: ${superAdmin.email} / Admin@123`);
  console.log(`  Organizer: ${organizer.email} / Organizer@123`);
  console.log(`  Packages: ${packages.length}`);
  console.log(`  Templates: ${templates.length}`);
  console.log(`  Guest tiers: ${guestTiers.join(", ")}`);
  console.log(`  Sample vendors: ${sampleVendors.length}`);
  console.log(`  Sample venues: ${sampleVenues.length}`);
  console.log(`  Design templates: ${designTemplateSchemas.length}`);
  console.log(`  Color palettes: ${palettes.length}`);
  console.log(`  Font assets: ${fonts.length}`);
  console.log(`  Template assets: ${templateAssets.length}`);

  await seedCommerceEngine();
  console.log("  Commerce engine: packages, add-ons, currencies, exchange rates seeded");

  await seedVendorOs();
  console.log("  VendorOS: categories, plans, vendor slugs seeded");

  await translationService.seedTranslations();
  console.log("  i18n: languages and EN/FR translations seeded");

  await invitationBlockService.seedTemplates();
  console.log("  Block builder: invitation block templates seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
