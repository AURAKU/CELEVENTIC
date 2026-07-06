import { prisma } from "@/lib/prisma";
import { paginatedResult } from "@/lib/pagination";

export class VenueService {
  async list(filters?: { capacity?: number; location?: string; page?: number; limit?: number }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 12;
    const skip = (page - 1) * limit;
    const where = {
      isActive: true,
      ...(filters?.capacity ? { capacity: { gte: filters.capacity } } : {}),
      ...(filters?.location ? { location: { contains: filters.location } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.venue.findMany({ where, orderBy: { name: "asc" }, skip, take: limit }),
      prisma.venue.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async getById(id: string) {
    return prisma.venue.findUnique({
      where: { id },
      include: { bookings: { where: { status: { not: "cancelled" } }, take: 10 } },
    });
  }

  async requestBooking(venueId: string, userId: string, eventDate: Date, notes?: string) {
    const conflicting = await prisma.venueBooking.findFirst({
      where: { venueId, eventDate, status: { in: ["pending", "confirmed"] } },
    });

    if (conflicting) throw new Error("Venue not available on this date");

    return prisma.venueBooking.create({
      data: { venueId, userId, eventDate, notes, status: "pending" },
    });
  }

  async getAvailability(venueId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const bookings = await prisma.venueBooking.findMany({
      where: {
        venueId,
        eventDate: { gte: start, lte: end },
        status: { in: ["pending", "confirmed"] },
      },
      select: { eventDate: true },
    });

    return bookings.map((b) => b.eventDate.toISOString().split("T")[0]);
  }
}

export const venueService = new VenueService();
