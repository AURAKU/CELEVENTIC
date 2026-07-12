import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";

export class OrganizerProfileService {
  async search(
    filters: {
      q?: string;
      city?: string;
      region?: string;
      specialty?: string;
      verified?: boolean;
    },
    pagination?: { page?: number; limit?: number }
  ) {
    const { page, limit, skip } = parsePaginationInput(pagination, { limit: 20 });

    const where: Record<string, unknown> = { isPublic: true };

    if (filters.verified) where.isVerified = true;
    if (filters.city) where.city = { contains: filters.city };
    if (filters.region) where.region = { contains: filters.region };

    if (filters.q) {
      const q = filters.q.trim();
      where.OR = [
        { bio: { contains: q } },
        { headline: { contains: q } },
        { city: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { username: { contains: q } } },
        { user: { companyName: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.organizerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              companyName: true,
            },
          },
        },
        orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { completedEventsCount: "desc" }],
        skip,
        take: limit,
      }),
      prisma.organizerProfile.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }

  async getBySlug(slug: string) {
    return prisma.organizerProfile.findFirst({
      where: { slug, isPublic: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async getClients(organizerId: string, pagination?: { page?: number; limit?: number }) {
    const { page, limit, skip } = parsePaginationInput(pagination);

    const [items, total] = await Promise.all([
      prisma.clientRelationship.findMany({
        where: { organizerId },
        include: {
          client: { select: { id: true, name: true, avatarUrl: true, username: true } },
        },
        orderBy: { lastEventAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.clientRelationship.count({ where: { organizerId } }),
    ]);

    return paginatedResult(items, total, page, limit);
  }
}

export const organizerProfileService = new OrganizerProfileService();
