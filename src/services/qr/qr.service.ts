import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { QrScanResult } from "@prisma/client";
import { QR_TYPES, ADMISSION_QR_TYPES, type QrIntentType } from "@/lib/qr/qr-types";
import { QR_DEFAULT_SIZE } from "@/lib/qr/qr-constants";
import { parseQrToken } from "@/lib/qr/parse-qr-payload";
import { qrBrandingService } from "@/services/qr/qr-branding.service";

export type QrAdmissionStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "already_checked_in"
  | "not_found"
  | "wrong_event"
  | "revoked"
  | "refunded"
  | "cancelled";

export function mapScanResultToStatus(result: QrScanResult): QrAdmissionStatus {
  switch (result) {
    case "VALID":
      return "valid";
    case "EXPIRED":
      return "expired";
    case "ALREADY_USED":
      return "already_checked_in";
    case "WRONG_EVENT":
      return "wrong_event";
    case "INVALID":
    default:
      return "invalid";
  }
}

interface QrLookupResult {
  status: QrAdmissionStatus;
  result: QrScanResult;
  scan: { id: string; createdAt: Date };
  admittedAt?: Date | null;
  guest?: { id: string; name: string; email?: string | null } | null;
  ticket?: { id: string; name: string } | null;
  event?: { id: string; title: string } | null;
  qrType?: string;
}

export class QrService {
  /** Branded QR PNG data URL — verify URL with event logo overlay */
  async generateBrandedVerifyQr(eventId: string, token: string): Promise<string> {
    return qrBrandingService.generateForEvent(eventId, token);
  }

  /** @deprecated use generateBrandedVerifyQr */
  async generateQrDataUrl(targetUrl: string, eventId?: string): Promise<string> {
    if (eventId) {
      const token = parseQrToken(targetUrl) ?? targetUrl.split("/").pop() ?? targetUrl;
      return qrBrandingService.generateForEvent(eventId, token);
    }
    const { generateBrandedQrDataUrl } = await import("@/lib/qr/branded-qr-generator");
    const adminLogo = await qrBrandingService.getAdminDefaultLogoUrl();
    return generateBrandedQrDataUrl(targetUrl, adminLogo);
  }

  async generatePortalQr(eventId: string, token: string) {
    return this.generateBrandedVerifyQr(eventId, token);
  }

  async generateVerifyQr(eventId: string, token: string) {
    return this.generateBrandedVerifyQr(eventId, token);
  }

  async getBrandedQrForToken(token: string) {
    return qrBrandingService.generateForToken(token);
  }

  private async createQr(eventId: string, type: QrIntentType, guestId?: string, ticketId?: string) {
    const token = generateToken(24);
    const qrCode = await prisma.qrCode.create({
      data: { eventId, guestId, ticketId, token, type },
    });
    const dataUrl = await this.generateBrandedVerifyQr(eventId, token);
    return { qrCode, dataUrl, token };
  }

  async createGuestInviteQr(eventId: string, guestId: string) {
    const result = await this.createQr(eventId, QR_TYPES.GUEST_INVITE, guestId);
    await prisma.guest.update({ where: { id: guestId }, data: { qrToken: result.token } });
    return result;
  }

  async createGuestAdmissionQr(eventId: string, guestId: string) {
    return this.createQr(eventId, QR_TYPES.GUEST_ADMISSION, guestId);
  }

  async createVipQr(eventId: string, guestId: string) {
    const result = await this.createQr(eventId, QR_TYPES.VIP, guestId);
    await prisma.guest.update({ where: { id: guestId }, data: { qrToken: result.token } });
    return result;
  }

  async createHouseholdQr(eventId: string, guestId: string) {
    const result = await this.createQr(eventId, QR_TYPES.HOUSEHOLD, guestId);
    await prisma.guest.update({ where: { id: guestId }, data: { qrToken: result.token } });
    return result;
  }

  async createPublicEventQr(eventId: string, _invitationId: string) {
    return this.createQr(eventId, QR_TYPES.PUBLIC_EVENT);
  }

  /** @deprecated use createGuestInviteQr */
  async createGuestQr(eventId: string, guestId: string) {
    return this.createGuestInviteQr(eventId, guestId);
  }

  async createTicketQr(eventId: string, ticketId: string) {
    const token = generateToken(24);
    const qrCode = await prisma.qrCode.create({
      data: { eventId, ticketId, token, type: QR_TYPES.TICKET },
    });
    await prisma.ticket.update({ where: { id: ticketId }, data: { qrToken: token } });
    const dataUrl = await this.generateBrandedVerifyQr(eventId, token);
    return { qrCode, dataUrl, token };
  }

  async getGuestAdmissionQr(guestId: string) {
    let qr = await prisma.qrCode.findFirst({
      where: { guestId, type: QR_TYPES.GUEST_ADMISSION },
    });
    if (!qr) {
      const guest = await prisma.guest.findUnique({ where: { id: guestId } });
      if (!guest) return null;
      const created = await this.createGuestAdmissionQr(guest.eventId, guestId);
      qr = created.qrCode;
    }
    const dataUrl = await qrBrandingService.generateForEvent(qr.eventId, qr.token, QR_DEFAULT_SIZE, "pass");
    return { qr, dataUrl, token: qr.token };
  }

  private async resolveQrRecord(rawToken: string) {
    const token = parseQrToken(rawToken) ?? rawToken.trim();

    const qrCode = await prisma.qrCode.findUnique({
      where: { token },
      include: {
        guest: true,
        ticket: true,
        event: true,
        scans: { where: { result: "VALID" }, take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    if (qrCode) return { token, qrCode };

    const guest = await prisma.guest.findUnique({
      where: { qrToken: token },
      include: { event: true, qrCodes: { where: { type: QR_TYPES.GUEST_ADMISSION }, take: 1 } },
    });
    if (guest?.qrCodes[0]) {
      const admission = await prisma.qrCode.findUnique({
        where: { id: guest.qrCodes[0].id },
        include: {
          guest: true,
          ticket: true,
          event: true,
          scans: { where: { result: "VALID" }, take: 1, orderBy: { createdAt: "desc" } },
        },
      });
      if (admission) return { token: admission.token, qrCode: admission };
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrToken: token },
      include: { event: true, qrCodes: { take: 1 } },
    });
    if (ticket?.qrCodes[0]) {
      const ticketQr = await prisma.qrCode.findUnique({
        where: { id: ticket.qrCodes[0].id },
        include: {
          guest: true,
          ticket: true,
          event: true,
          scans: { where: { result: "VALID" }, take: 1, orderBy: { createdAt: "desc" } },
        },
      });
      if (ticketQr) return { token: ticketQr.token, qrCode: ticketQr };
    }

    return { token, qrCode: null };
  }

  async verifyQr(
    rawToken: string,
    eventId?: string,
    scannedBy?: string,
    gate?: string,
    deviceInfo?: string
  ): Promise<QrLookupResult> {
    return this.processScan(rawToken, eventId, scannedBy, gate, deviceInfo, false, false);
  }

  async checkInQr(
    rawToken: string,
    eventId?: string,
    scannedBy?: string,
    gate?: string,
    deviceInfo?: string,
    override = false
  ): Promise<QrLookupResult> {
    return this.processScan(rawToken, eventId, scannedBy, gate, deviceInfo, true, override);
  }

  private async processScan(
    rawToken: string,
    eventId: string | undefined,
    scannedBy: string | undefined,
    gate: string | undefined,
    deviceInfo: string | undefined,
    performCheckIn: boolean,
    override: boolean
  ): Promise<QrLookupResult> {
    const parsed = parseQrToken(rawToken);
    if (!parsed && !rawToken.trim()) {
      const scan = await this.logScan(null, eventId, scannedBy, gate, "INVALID", rawToken, undefined, undefined, deviceInfo);
      return { status: "not_found", result: "INVALID", scan: { id: scan.scan.id, createdAt: scan.scan.createdAt } };
    }

    const { token, qrCode } = await this.resolveQrRecord(rawToken);

    if (!qrCode) {
      const scan = await this.logScan(null, eventId, scannedBy, gate, "INVALID", token, undefined, undefined, deviceInfo);
      return { status: "not_found", result: "INVALID", scan: { id: scan.scan.id, createdAt: scan.scan.createdAt } };
    }

    const entityStatus = this.resolveEntityBlockStatus(qrCode);
    if (entityStatus) {
      const scan = await this.logScan(
        qrCode.id,
        qrCode.eventId,
        scannedBy,
        gate,
        "INVALID",
        token,
        qrCode.guestId ?? undefined,
        qrCode.ticketId ?? undefined,
        deviceInfo
      );
      return this.formatLookup(entityStatus, scan, qrCode);
    }

    if (qrCode.isRevoked) {
      const scan = await this.logScan(
        qrCode.id,
        qrCode.eventId,
        scannedBy,
        gate,
        "INVALID",
        token,
        qrCode.guestId ?? undefined,
        qrCode.ticketId ?? undefined,
        deviceInfo
      );
      return this.formatLookup("revoked", scan, qrCode);
    }

    if (!ADMISSION_QR_TYPES.includes(qrCode.type as QrIntentType)) {
      const scan = await this.logScan(
        qrCode.id,
        qrCode.eventId,
        scannedBy,
        gate,
        "INVALID",
        token,
        qrCode.guestId ?? undefined,
        qrCode.ticketId ?? undefined,
        deviceInfo
      );
      return this.formatLookup("invalid", scan, qrCode);
    }

    if (eventId && qrCode.eventId !== eventId) {
      const scan = await this.logScan(
        qrCode.id,
        qrCode.eventId,
        scannedBy,
        gate,
        "WRONG_EVENT",
        token,
        qrCode.guestId ?? undefined,
        qrCode.ticketId ?? undefined,
        deviceInfo
      );
      return this.formatLookup("wrong_event", scan, qrCode);
    }

    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      const scan = await this.logScan(
        qrCode.id,
        qrCode.eventId,
        scannedBy,
        gate,
        "EXPIRED",
        token,
        qrCode.guestId ?? undefined,
        qrCode.ticketId ?? undefined,
        deviceInfo
      );
      return this.formatLookup("expired", scan, qrCode);
    }

    const alreadyUsed = qrCode.scans.length > 0;
    if (alreadyUsed && !(performCheckIn && override)) {
      const scan = await this.logScan(
        qrCode.id,
        qrCode.eventId,
        scannedBy,
        gate,
        "ALREADY_USED",
        token,
        qrCode.guestId ?? undefined,
        qrCode.ticketId ?? undefined,
        deviceInfo
      );
      return this.formatLookup("already_checked_in", scan, qrCode);
    }

    if (!performCheckIn) {
      return {
        status: "valid",
        result: "VALID",
        scan: { id: "preview", createdAt: new Date() },
        guest: qrCode.guest ? { id: qrCode.guest.id, name: qrCode.guest.name, email: qrCode.guest.email } : null,
        ticket: qrCode.ticket ? { id: qrCode.ticket.id, name: qrCode.ticket.name } : null,
        event: qrCode.event ? { id: qrCode.event.id, title: qrCode.event.title } : null,
        qrType: qrCode.type,
      };
    }

    const scan = await this.logScan(
      qrCode.id,
      qrCode.eventId,
      scannedBy,
      gate,
      "VALID",
      token,
      qrCode.guestId ?? undefined,
      qrCode.ticketId ?? undefined,
      deviceInfo
    );

    if (qrCode.guestId) {
      await prisma.guest.update({
        where: { id: qrCode.guestId },
        data: { status: "CHECKED_IN" },
      });
    }

    if (qrCode.ticketId) {
      await prisma.ticket.update({
        where: { id: qrCode.ticketId },
        data: { status: "USED" },
      });
    }

    return this.formatLookup("valid", scan, qrCode);
  }

  private formatLookup(
    status: QrAdmissionStatus,
    logged: { result: QrScanResult; scan: { id: string; createdAt: Date } },
    qrCode: {
      type: string;
      guest: { id: string; name: string; email: string | null } | null;
      ticket: { id: string; name: string } | null;
      event: { id: string; title: string };
      scans?: { createdAt: Date }[];
    }
  ): QrLookupResult {
    const firstValidScan = qrCode.scans?.[0]?.createdAt ?? null;
    return {
      status,
      result: logged.result,
      scan: { id: logged.scan.id, createdAt: logged.scan.createdAt },
      admittedAt: status === "already_checked_in" ? firstValidScan : status === "valid" ? logged.scan.createdAt : null,
      guest: qrCode.guest ? { id: qrCode.guest.id, name: qrCode.guest.name, email: qrCode.guest.email } : null,
      ticket: qrCode.ticket ? { id: qrCode.ticket.id, name: qrCode.ticket.name } : null,
      event: { id: qrCode.event.id, title: qrCode.event.title },
      qrType: qrCode.type,
    };
  }

  async getRecentScans(eventId: string, limit = 20) {
    return prisma.qrScan.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        guest: { select: { id: true, name: true } },
        ticket: { select: { id: true, name: true } },
        scanner: { select: { id: true, name: true } },
      },
    });
  }

  async revokeToken(token: string, revokedBy: string) {
    const qr = await prisma.qrCode.findUnique({ where: { token } });
    if (!qr) return null;
    await prisma.qrCode.update({
      where: { id: qr.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await createAuditLog({
      userId: revokedBy,
      action: "QR_SCAN",
      entity: "qr_code",
      entityId: qr.id,
      details: { action: "revoke", token: token.slice(0, 8) },
    });
    return qr;
  }

  async regenerateEventTokens(eventId: string) {
    const codes = await prisma.qrCode.findMany({
      where: { eventId, isRevoked: false },
      select: { id: true, guestId: true, ticketId: true, type: true },
    });
    return { count: codes.length, message: "Branding cache invalidated; tokens remain secure verify URLs." };
  }

  private resolveEntityBlockStatus(qrCode: {
    guest: { status: string } | null;
    ticket: { status: string } | null;
  }): QrAdmissionStatus | null {
    if (qrCode.ticket) {
      if (qrCode.ticket.status === "REFUNDED") return "refunded";
      if (qrCode.ticket.status === "CANCELLED") return "cancelled";
      if (qrCode.ticket.status === "EXPIRED") return "expired";
    }
    if (qrCode.guest?.status === "DECLINED") return "cancelled";
    return null;
  }

  async getAdmissionStats(eventId: string) {
    const [guestTotal, guestCheckedIn, ticketTotal, ticketUsed, invalidAttempts, recentValid] = await Promise.all([
      prisma.guest.count({ where: { eventId } }),
      prisma.guest.count({ where: { eventId, status: "CHECKED_IN" } }),
      prisma.ticket.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId, status: "USED" } }),
      prisma.qrScan.count({
        where: {
          eventId,
          result: { in: ["INVALID", "EXPIRED", "WRONG_EVENT"] },
        },
      }),
      prisma.qrScan.findMany({
        where: { eventId, result: "VALID" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          guest: { select: { name: true } },
          ticket: { select: { name: true } },
        },
      }),
    ]);

    const totalPasses = guestTotal + ticketTotal;
    const checkedIn = guestCheckedIn + ticketUsed;
    const pending = Math.max(0, totalPasses - checkedIn);
    const checkInRate = totalPasses > 0 ? Math.round((checkedIn / totalPasses) * 100) : 0;

    return {
      totalTickets: ticketTotal,
      totalGuests: guestTotal,
      totalPasses,
      checkedIn,
      pending,
      invalidAttempts,
      checkInRate,
      lastScanned: recentValid.map((s) => ({
        id: s.id,
        name: s.guest?.name ?? s.ticket?.name ?? "Unknown",
        at: s.createdAt,
        gate: s.gate,
      })),
    };
  }

  private async logScan(
    qrCodeId: string | null,
    eventId: string | undefined,
    scannedBy: string | undefined,
    gate: string | undefined,
    result: QrScanResult,
    token: string,
    guestId?: string,
    ticketId?: string,
    deviceInfo?: string
  ) {
    let resolvedEventId = eventId;
    if (!resolvedEventId && qrCodeId) {
      const qr = await prisma.qrCode.findUnique({ where: { id: qrCodeId }, select: { eventId: true } });
      resolvedEventId = qr?.eventId;
    }
    if (!resolvedEventId) {
      const qr = await prisma.qrCode.findUnique({ where: { token }, select: { eventId: true } });
      resolvedEventId = qr?.eventId ?? "";
    }

    if (!resolvedEventId) {
      return { result, scan: { id: "unlogged", createdAt: new Date() } };
    }

    const scan = await prisma.qrScan.create({
      data: {
        eventId: resolvedEventId,
        qrCodeId: qrCodeId ?? undefined,
        guestId,
        ticketId,
        scannedBy,
        gate,
        result,
        deviceInfo,
      },
    });

    return { result, scan };
  }
}

export const qrService = new QrService();
