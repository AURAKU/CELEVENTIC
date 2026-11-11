import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import type { EventStatus } from "@prisma/client";
import {
  paginatedResult,
  parsePaginationInput,
  PUBLIC_GRID_LIMIT,
  type PaginatedResult,
} from "@/lib/pagination";
import {
  PUBLIC_EVENT_SELECT,
  toPublicDiscoverEvent,
  type PublicDiscoverEvent,
} from "@/lib/discovery/public-event";

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

const LIST_SELECT = {
  ...PUBLIC_EVENT_SELECT,
  latitude: true,
  longitude: true,
};

export class DiscoveryService {
  async discover(filters: DiscoveryFilters): Promise<PaginatedResult<PublicDiscoverEvent>> {
    const { page, limit, skip } = parsePaginationInput(filters, { limit: PUBLIC_GRID_LIMIT });

    const cacheKey = `discovery:v5:${JSON.stringify({ ...filters, page, limit })}`;
    const cached = await cacheGet<PaginatedResult<PublicDiscoverEvent>>(cacheKey);
    if (cached) return cached;

    const where = {
      isPublic: true,
      status: { in: ["PUBLISHED", "LIVE"] as EventStatus[] },
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.country ? { country: filters.country } : {}),
      ...(filters.eventType ? { eventType: filters.eventType as never } : {}),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }],
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    let rows = events;

    if (filters.latitude && filters.longitude) {
      rows = events
        .map((event) => ({
          event,
          distance: this.haversineKm(
            filters.latitude!,
            filters.longitude!,
            Number(event.latitude ?? 0),
            Number(event.longitude ?? 0)
          ),
        }))
        .filter((entry) => entry.distance <= (filters.radiusKm ?? 50))
        .sort((a, b) => a.distance - b.distance)
        .map((entry) => entry.event);
    }

    const result = paginatedResult(rows.map(toPublicDiscoverEvent), total, page, limit);
    await cacheSet(cacheKey, result, 120);
    return result;
  }

  async getFeatured(): Promise<PublicDiscoverEvent[]> {
    const events = await prisma.event.findMany({
      where: { isPublic: true, isFeatured: true, status: { in: ["PUBLISHED", "LIVE"] } },
      select: PUBLIC_EVENT_SELECT,
      take: 6,
      orderBy: { startDate: "asc" },
    });
    return events.map(toPublicDiscoverEvent);
  }

  async getNearbyEvents(latitude: number, longitude: number, radiusKm = 25, page = 1) {
    return this.discover({ latitude, longitude, radiusKm, page });
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
