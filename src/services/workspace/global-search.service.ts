import { prisma } from "@/lib/prisma";
import { parsePaginationInput } from "@/lib/pagination";
import { eventAccessWhere } from "@/lib/workspace/event-access";

export async function globalSearch(
  userId: string,
  query: string,
  types?: string[]
) {
  const { limit } = parsePaginationInput({ limit: 20 });
  const q = query.trim();
  if (!q) {
    return { users: [], organizers: [], vendors: [], events: [], organizations: [] };
  }

  const searchTypes = types?.length ? types : ["users", "organizers", "vendors", "events", "organizations"];

  const results: Record<string, unknown[]> = {};

  if (searchTypes.includes("users")) {
    results.users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { username: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, username: true, avatarUrl: true, role: true },
      take: limit,
    });
  }

  if (searchTypes.includes("organizers")) {
    results.organizers = await prisma.organizerProfile.findMany({
      where: {
        isPublic: true,
        OR: [
          { bio: { contains: q } },
          { headline: { contains: q } },
          { user: { name: { contains: q } } },
          { user: { companyName: { contains: q } } },
        ],
      },
      include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      take: limit,
    });
  }

  if (searchTypes.includes("vendors")) {
    results.vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        OR: [
          { businessName: { contains: q } },
          { category: { contains: q } },
          { city: { contains: q } },
        ],
      },
      select: {
        id: true,
        slug: true,
        businessName: true,
        category: true,
        city: true,
        profileImage: true,
        rating: true,
        isVerified: true,
      },
      take: limit,
    });
  }

  if (searchTypes.includes("events")) {
    results.events = await prisma.event.findMany({
      where: {
        AND: [eventAccessWhere(userId), { title: { contains: q } }],
      },
      select: { id: true, title: true, eventType: true, startDate: true, coverImageUrl: true, status: true },
      take: limit,
    });
  }

  if (searchTypes.includes("organizations")) {
    results.organizations = await prisma.organization.findMany({
      where: {
        isActive: true,
        name: { contains: q },
      },
      select: { id: true, name: true, slug: true, logoUrl: true, country: true },
      take: limit,
    });
  }

  return results;
}
