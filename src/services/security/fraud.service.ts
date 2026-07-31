import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import type { FraudSeverity, Prisma } from "@prisma/client";

export class FraudService {
  async logIncident(
    type: string,
    severity: FraudSeverity,
    details: Record<string, unknown>,
    eventId?: string
  ) {
    const log = await prisma.fraudDetectionLog.create({
      data: {
        eventId,
        type,
        severity,
        details: details as Prisma.InputJsonValue,
      },
    });

    if (severity === "HIGH" || severity === "CRITICAL") {
      await createAuditLog({
        action: "FRAUD_DETECTED",
        entity: "fraud",
        entityId: log.id,
        details: { type, severity, eventId },
      });
    }

    return log;
  }

  async detectQrAbuse(eventId: string, scannedBy: string, scanCount: number) {
    if (scanCount > 100) {
      return this.logIncident(
        "QR_SCAN_ABUSE",
        "HIGH",
        { scannedBy, scanCount, window: "1h" },
        eventId
      );
    }
    return null;
  }

  async getUnresolved(eventId?: string, page = 1, limit = 20) {
    const take = Math.min(100, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * take;
    const where = { resolved: false, ...(eventId ? { eventId } : {}) };
    const [items, total] = await Promise.all([
      prisma.fraudDetectionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.fraudDetectionLog.count({ where }),
    ]);
    const pages = Math.max(1, Math.ceil(total / take));
    return { items, total, page: safePage, limit: take, pages, hasMore: safePage < pages };
  }

  async resolve(id: string) {
    return prisma.fraudDetectionLog.update({
      where: { id },
      data: { resolved: true },
    });
  }
}

export const fraudService = new FraudService();
