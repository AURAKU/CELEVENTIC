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

  async getUnresolved(eventId?: string) {
    return prisma.fraudDetectionLog.findMany({
      where: { resolved: false, ...(eventId ? { eventId } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async resolve(id: string) {
    return prisma.fraudDetectionLog.update({
      where: { id },
      data: { resolved: true },
    });
  }
}

export const fraudService = new FraudService();
