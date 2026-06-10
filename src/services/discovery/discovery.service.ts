import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";

export interface DiscoveryFilters {
  city?: string;
  country?: string;
  eventType?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export class DiscoveryService {
  async discover(filters: DiscoveryFilters) {
    const cacheKey = `discovery:${JSON.stringify(filters)}`;
    const cached = await cacheGet<unknown[]>(cacheKey);
    if (cached) return cached;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const events = await prisma.event.findMany({
      where: {
        isPublic: true,
        status: { in: ["PUBLISHED", "LIVE"] },
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.country ? { country: filters.country } : {}),
        ...(filters.eventType ? { eventType: filters.eventType as never } : {}),
      },
      include: {
        package: true,
        _count: { select: { guests: true, tickets: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    });

    let results = events;

    if (filters.latitude && filters.longitude) {
      results = events
        .map((event) => ({
          event,
          distance: this.haversineKm(
            filters.latitude!,
            filters.longitude!,
            Number(event.latitude ?? 0),
            Number(event.longitude ?? 0)
          ),
        }))
        .filter((e) => e.distance <= (filters.radiusKm ?? 50))
        .sort((a, b) => a.distance - b.distance)
        .map((e) => e.event);
    }

    await cacheSet(cacheKey, results, 120);
    return results;
  }

  async getFeatured() {
    return prisma.event.findMany({
      where: { isPublic: true, isFeatured: true, status: { in: ["PUBLISHED", "LIVE"] } },
      take: 6,
      orderBy: { startDate: "asc" },
    });
  }

  async getNearbyEvents(latitude: number, longitude: number, radiusKm = 25) {
    return this.discover({ latitude, longitude, radiusKm });
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export const discoveryService = new DiscoveryService();
