import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationFromUrl } from "@/lib/pagination";
import type { QrScanResult } from "@prisma/client";

export class QrAnalyticsService {
  async getScanHistory(eventId: string, url: string) {
    const { page, limit, skip } = parsePaginationFromUrl(url);

    const [items, total] = await Promise.all([
      prisma.qrScan.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          guest: { select: { id: true, name: true } },
          ticket: { select: { id: true, name: true } },
          scanner: { select: { id: true, name: true } },
        },
      }),
      prisma.qrScan.count({ where: { eventId } }),
    ]);

    return paginatedResult(
      items.map((s) => ({
        id: s.id,
        result: s.result,
        status: mapResultToDisplay(s.result),
        guestName: s.guest?.name,
        ticketName: s.ticket?.name,
        scannerName: s.scanner?.name,
        gate: s.gate,
        deviceInfo: s.deviceInfo,
        createdAt: s.createdAt,
      })),
      total,
      page,
      limit
    );
  }

  async getEventStats(eventId: string) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [
      totalScans,
      validScans,
      duplicateAttempts,
      failedScans,
      uniqueQrCodes,
      guestTotal,
      guestCheckedIn,
      ticketTotal,
      ticketUsed,
      ticketPaid,
      hourlyRaw,
      deviceRaw,
    ] = await Promise.all([
      prisma.qrScan.count({ where: { eventId } }),
      prisma.qrScan.count({ where: { eventId, result: "VALID" } }),
      prisma.qrScan.count({ where: { eventId, result: "ALREADY_USED" } }),
      prisma.qrScan.count({
        where: { eventId, result: { in: ["INVALID", "EXPIRED", "WRONG_EVENT"] } },
      }),
      prisma.qrScan.groupBy({
        by: ["qrCodeId"],
        where: { eventId, qrCodeId: { not: null }, result: "VALID" },
      }),
      prisma.guest.count({ where: { eventId } }),
      prisma.guest.count({ where: { eventId, status: "CHECKED_IN" } }),
      prisma.ticket.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId, status: "USED" } }),
      prisma.ticket.count({ where: { eventId, status: "PAID" } }),
      prisma.qrScan.findMany({
        where: { eventId, result: "VALID", createdAt: { gte: dayStart } },
        select: { createdAt: true },
      }),
      prisma.qrScan.findMany({
        where: { eventId, deviceInfo: { not: null } },
        select: { deviceInfo: true },
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPasses = guestTotal + ticketTotal;
    const checkedIn = guestCheckedIn + ticketUsed;
    const pending = Math.max(0, totalPasses - checkedIn);
    const attendanceRate = totalPasses > 0 ? Math.round((checkedIn / totalPasses) * 100) : 0;
    const ticketConversionRate =
      ticketTotal > 0 ? Math.round((ticketPaid / ticketTotal) * 100) : 0;

    const checkInsByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyRaw.filter((s) => s.createdAt.getHours() === hour).length,
    }));

    const deviceCounts: Record<string, number> = {};
    for (const row of deviceRaw) {
      let label = "unknown";
      if (row.deviceInfo) {
        try {
          const parsed = JSON.parse(row.deviceInfo) as { ua?: string };
          const ua = parsed.ua ?? "";
          if (/mobile|android|iphone/i.test(ua)) label = "mobile";
          else if (/tablet|ipad/i.test(ua)) label = "tablet";
          else label = "desktop";
        } catch {
          label = "unknown";
        }
      }
      deviceCounts[label] = (deviceCounts[label] ?? 0) + 1;
    }

    return {
      totalScans,
      uniqueScans: uniqueQrCodes.length,
      validScans,
      duplicateAttempts,
      failedScans,
      totalPasses,
      checkedIn,
      pending,
      attendanceRate,
      ticketConversionRate,
      checkInsByHour,
      devices: deviceCounts,
      lastUpdated: now.toISOString(),
    };
  }

  async getFailedScans(eventId: string, url: string) {
    const { page, limit, skip } = parsePaginationFromUrl(url);
    const where = {
      eventId,
      result: { in: ["INVALID", "EXPIRED", "WRONG_EVENT", "ALREADY_USED"] as QrScanResult[] },
    };

    const [items, total] = await Promise.all([
      prisma.qrScan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          result: true,
          gate: true,
          deviceInfo: true,
          createdAt: true,
          guest: { select: { name: true } },
          ticket: { select: { name: true } },
        },
      }),
      prisma.qrScan.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }
}

function mapResultToDisplay(result: QrScanResult) {
  switch (result) {
    case "VALID":
      return "checked_in";
    case "ALREADY_USED":
      return "duplicate_scan";
    case "EXPIRED":
      return "expired";
    case "WRONG_EVENT":
      return "wrong_event";
    default:
      return "invalid";
  }
}

export const qrAnalyticsService = new QrAnalyticsService();
