import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { seedVendorOs } from "@/services/vendor-os/vendor-os-seed.service";

export interface DirectoryFilters {
  search?: string;
  category?: string;
  city?: string;
  region?: string;
  verified?: boolean;
  featured?: boolean;
  minRating?: number;
  priceMin?: number;
  priceMax?: number;
  availableDate?: string;
  sort?: "recommended" | "newest" | "rating" | "verified" | "featured";
  page?: number;
  limit?: number;
}

export class VendorDirectoryService {
  async search(filters: DirectoryFilters = {}) {
    await seedVendorOs();

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 24, 48);
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {
      isActive: true,
      status: "ACTIVE",
      ...(filters.category ? { category: { contains: filters.category } } : {}),
      ...(filters.city ? { city: { contains: filters.city } } : {}),
      ...(filters.region ? { region: { contains: filters.region } } : {}),
      ...(filters.verified ? { isVerified: true } : {}),
      ...(filters.featured ? { isFeatured: true } : {}),
      ...(filters.minRating ? { rating: { gte: filters.minRating } } : {}),
      ...(filters.search
        ? {
            OR: [
              { businessName: { contains: filters.search } },
              { bio: { contains: filters.search } },
              { city: { contains: filters.search } },
            ],
          }
        : {}),
    };

    let orderBy: Prisma.VendorOrderByWithRelationInput[] = [{ isFeatured: "desc" }, { rating: "desc" }];
    if (filters.sort === "newest") orderBy = [{ createdAt: "desc" }];
    if (filters.sort === "rating") orderBy = [{ rating: "desc" }];
    if (filters.sort === "verified") orderBy = [{ isVerified: "desc" }, { rating: "desc" }];
    if (filters.sort === "featured") orderBy = [{ isFeatured: "desc" }, { rating: "desc" }];

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          rateCards: { where: { isActive: true }, take: 1 },
          services: { where: { isActive: true }, take: 1 },
          categoryAssignments: { include: { category: true } },
          _count: { select: { reviews: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
    ]);

    let filtered = vendors;
    if (filters.availableDate) {
      const date = new Date(filters.availableDate);
      const unavailable = await prisma.vendorAvailability.findMany({
        where: {
          date: { gte: new Date(date.setHours(0, 0, 0, 0)), lte: new Date(date.setHours(23, 59, 59, 999)) },
          status: { in: ["FULLY_BOOKED", "UNAVAILABLE", "VACATION"] },
        },
        select: { vendorId: true },
      });
      const blocked = new Set(unavailable.map((u) => u.vendorId));
      filtered = vendors.filter((v) => !blocked.has(v.id));
    }

    return { vendors: filtered, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCategories() {
    return prisma.vendorCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }
}

export const vendorDirectoryService = new VendorDirectoryService();
