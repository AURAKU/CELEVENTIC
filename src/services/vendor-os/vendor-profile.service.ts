import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { seedVendorOs } from "@/services/vendor-os/vendor-os-seed.service";
import type { Prisma } from "@prisma/client";

export interface VendorSignupInput {
  userId: string;
  businessName: string;
  vendorType?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  category: string;
  categorySlugs?: string[];
  serviceAreas?: string[];
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  bio?: string;
  yearsExperience?: number;
  profileImage?: string;
  coverImage?: string;
  socialLinks?: { platform: string; url: string }[];
}

export class VendorProfileService {
  async ensureSeeded() {
    const count = await prisma.vendorCategory.count();
    if (count === 0) await seedVendorOs();
  }

  private async uniqueSlug(name: string) {
    let slug = slugify(name);
    const exists = await prisma.vendor.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;
    return slug;
  }

  async signup(input: VendorSignupInput) {
    await this.ensureSeeded();
    const freePlan = await prisma.vendorPlan.findUnique({ where: { slug: "free" } });
    const slug = await this.uniqueSlug(input.businessName);

    const { getMarketplaceFeatureFlags } = await import("@/lib/marketplace/feature-flags");
    const flags = await getMarketplaceFeatureFlags();

    const vendor = await prisma.vendor.create({
      data: {
        userId: input.userId,
        slug,
        businessName: input.businessName,
        vendorType: input.vendorType ?? "individual",
        ownerName: input.ownerName,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp,
        category: input.category,
        bio: input.bio,
        description: input.bio,
        address: input.address,
        city: input.city,
        region: input.region,
        country: input.country ?? "Ghana",
        location: [input.city, input.region].filter(Boolean).join(", ") || undefined,
        serviceAreas: input.serviceAreas as Prisma.InputJsonValue,
        yearsExperience: input.yearsExperience,
        profileImage: input.profileImage,
        coverImage: input.coverImage,
        planId: freePlan?.id,
        status: flags.vendorApprovalRequired ? "PENDING_APPROVAL" : "ACTIVE",
        isActive: !flags.vendorApprovalRequired,
      },
    });

    if (input.categorySlugs?.length) {
      const cats = await prisma.vendorCategory.findMany({ where: { slug: { in: input.categorySlugs } } });
      for (const cat of cats) {
        await prisma.vendorCategoryAssignment.create({ data: { vendorId: vendor.id, categoryId: cat.id } });
      }
    }

    if (input.socialLinks?.length) {
      await prisma.vendorSocialLink.createMany({
        data: input.socialLinks.map((s, i) => ({
          vendorId: vendor.id,
          platform: s.platform,
          url: s.url,
          sortOrder: i,
        })),
      });
    }

    await prisma.user.update({ where: { id: input.userId }, data: { role: "VENDOR" } });
    return this.getBySlug(slug);
  }

  async getBySlug(slug: string) {
    return prisma.vendor.findFirst({
      where: { slug, isActive: true },
      include: {
        plan: true,
        socialLinks: { orderBy: { sortOrder: "asc" } },
        media: { where: { status: "active" }, orderBy: { sortOrder: "asc" } },
        rateCards: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        eventReferences: { where: { isPublished: true }, orderBy: { sortOrder: "asc" } },
        categoryAssignments: { include: { category: true } },
        reviews: {
          where: { status: "published" },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        services: { where: { isActive: true } },
        _count: { select: { favorites: true, leads: true } },
      },
    });
  }

  async getByUserId(userId: string) {
    return prisma.vendor.findFirst({
      where: { userId },
      include: {
        plan: true,
        socialLinks: true,
        media: true,
        rateCards: true,
        categoryAssignments: { include: { category: true } },
      },
    });
  }

  async updateProfileImage(vendorId: string, userId: string, profileImage: string | null) {
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, userId } });
    if (!vendor) throw new Error("Vendor not found");

    return prisma.vendor.update({
      where: { id: vendorId },
      data: { profileImage },
    });
  }

  async updateProfile(vendorId: string, userId: string, data: Partial<VendorSignupInput>) {
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, userId } });
    if (!vendor) throw new Error("Vendor not found");

    return prisma.vendor.update({
      where: { id: vendorId },
      data: {
        businessName: data.businessName,
        vendorType: data.vendorType,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        category: data.category,
        bio: data.bio,
        description: data.bio,
        address: data.address,
        city: data.city,
        region: data.region,
        country: data.country,
        location: data.city ? `${data.city}${data.region ? `, ${data.region}` : ""}` : undefined,
        serviceAreas: data.serviceAreas as Prisma.InputJsonValue,
        yearsExperience: data.yearsExperience,
        profileImage: data.profileImage,
        coverImage: data.coverImage,
      },
    });
  }

  async trackEvent(vendorId: string, eventType: string, metadata?: Record<string, unknown>) {
    return prisma.vendorAnalyticsEvent.create({
      data: { vendorId, eventType, metadata: metadata as Prisma.InputJsonValue },
    });
  }
}

export const vendorProfileService = new VendorProfileService();
