import { prisma } from "@/lib/prisma";
import { vendorDirectoryService } from "@/services/vendor-os/vendor-directory.service";
import { vendorLeadService } from "@/services/vendor-os/vendor-lead.service";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { seedVendorOs } from "@/services/vendor-os/vendor-os-seed.service";

export interface CreateVendorInput {
  userId: string;
  businessName: string;
  category: string;
  description?: string;
  location?: string;
}

/** Legacy vendor service — delegates to VendorOS where possible */
export class VendorService {
  async create(input: CreateVendorInput) {
    await seedVendorOs();
    const [city] = (input.location ?? "").split(",").map((s) => s.trim());
    return vendorProfileService.signup({
      userId: input.userId,
      businessName: input.businessName,
      category: input.category,
      bio: input.description,
      city: city || undefined,
    });
  }

  async list(filters?: { category?: string; location?: string; verified?: boolean }) {
    const result = await vendorDirectoryService.search({
      category: filters?.category,
      city: filters?.location,
      verified: filters?.verified,
      limit: 50,
    });
    return result.vendors;
  }

  async getById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        services: true,
        reviews: { include: { user: { select: { name: true } } }, take: 10 },
        rateCards: { where: { isActive: true } },
        media: { where: { status: "active" }, take: 20 },
        socialLinks: true,
      },
    });
    return vendor;
  }

  async getBySlug(slug: string) {
    return vendorProfileService.getBySlug(slug);
  }

  async requestBooking(vendorId: string, userId: string, eventId?: string, notes?: string) {
    return vendorLeadService.createLead({
      vendorId,
      organizerId: userId,
      eventId,
      message: notes,
    });
  }

  async addReview(vendorId: string, userId: string, rating: number, comment?: string) {
    const review = await prisma.vendorReview.create({
      data: { vendorId, userId, rating, comment, status: "published" },
    });

    const stats = await prisma.vendorReview.aggregate({
      where: { vendorId, status: "published" },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count,
      },
    });

    return review;
  }
}

export const vendorService = new VendorService();
