import { prisma } from "@/lib/prisma";
import { DEFAULT_VENDOR_CATEGORIES, DEFAULT_VENDOR_PLANS } from "@/lib/vendor-os/constants";
import { slugify } from "@/lib/utils";

export async function seedVendorOs() {
  for (const [i, cat] of DEFAULT_VENDOR_CATEGORIES.entries()) {
    await prisma.vendorCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: i, isActive: true },
      create: { slug: cat.slug, name: cat.name, icon: cat.icon, sortOrder: i },
    });
  }

  for (const [i, plan] of DEFAULT_VENDOR_PLANS.entries()) {
    await prisma.vendorPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        priceGhs: plan.priceGhs,
        durationDays: plan.durationDays,
        imageLimit: plan.imageLimit,
        videoLimit: plan.videoLimit,
        storageLimitMb: plan.storageLimitMb,
        categoryLimit: plan.categoryLimit,
        portfolioEventLimit: plan.portfolioEventLimit,
        verifiedBadge: plan.verifiedBadge,
        featuredSearch: plan.featuredSearch,
        advancedAnalytics: plan.advancedAnalytics,
        priorityLeads: plan.priorityLeads,
        sortOrder: i,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        priceGhs: plan.priceGhs,
        durationDays: plan.durationDays,
        imageLimit: plan.imageLimit,
        videoLimit: plan.videoLimit,
        storageLimitMb: plan.storageLimitMb,
        categoryLimit: plan.categoryLimit,
        portfolioEventLimit: plan.portfolioEventLimit,
        verifiedBadge: plan.verifiedBadge,
        featuredSearch: plan.featuredSearch,
        advancedAnalytics: plan.advancedAnalytics,
        priorityLeads: plan.priorityLeads,
        sortOrder: i,
      },
    });
  }

  const freePlan = await prisma.vendorPlan.findUnique({ where: { slug: "free" } });

  const allVendors = await prisma.vendor.findMany();
  for (const v of allVendors) {
    if (!v.slug) {
      let slug = slugify(v.businessName);
      const exists = await prisma.vendor.findFirst({ where: { slug, NOT: { id: v.id } } });
      if (exists) slug = `${slug}-${v.id.slice(-6)}`;
      await prisma.vendor.update({
        where: { id: v.id },
        data: {
          slug,
          planId: v.planId ?? freePlan?.id,
          city: v.city ?? v.location?.split(",")[0],
        },
      });
    }
  }

  const venues = await prisma.venue.findMany({ where: { slug: null } });
  for (const venue of venues) {
    const slug = slugify(venue.name);
    await prisma.venue.update({ where: { id: venue.id }, data: { slug } });
  }

  await prisma.marketplaceCommissionRule.upsert({
    where: { key: "global" },
    update: { label: "Global marketplace commission", commissionPercent: 10, isActive: true },
    create: { key: "global", label: "Global marketplace commission", commissionPercent: 10, isActive: true },
  });
}
