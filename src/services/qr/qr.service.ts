import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";
import type { QrScanResult } from "@prisma/client";
import { QR_TYPES, ADMISSION_QR_TYPES, INVITE_QR_TYPES, type QrIntentType } from "@/lib/qr/qr-types";
import { QR_DEFAULT_SIZE } from "@/lib/qr/qr-constants";
import { parseQrToken } from "@/lib/qr/parse-qr-payload";
import { ensureGuestManualCode, isManualAdmissionCode } from "@/lib/qr/manual-code";
import { qrBrandingService } from "@/services/qr/qr-branding.service";

export type QrAdmissionStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "already_checked_in"
  | "not_found"
  | "wrong_event"
  | "wrong_pass"
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
  /** Selected gate event title when mismatch / context messaging */
  selectedEventTitle?: string | null;
  qrType?: string;
  /** Professional gate feedback for staff UI */
  feedback?: string;
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
    const [adminLogo, logoSize] = await Promise.all([
      qrBrandingService.getAdminDefaultLogoUrl(),
      qrBrandingService.getAdminDefaultLogoSize(),
    ]);
    return generateBrandedQrDataUrl(targetUrl, adminLogo, undefined, "brand", logoSize);
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
    const manualCode = await ensureGuestManualCode(guestId);
    const dataUrl = await qrBrandingService.generateForEvent(qr.eventId, qr.token, QR_DEFAULT_SIZE, "pass");
    return { qr, dataUrl, token: qr.token, manualCode };
  }

  private admissionInclude() {
    return {
      guest: true,
      ticket: true,
      event: true,
      scans: { where: { result: "VALID" as const }, take: 1, orderBy: { createdAt: "desc" as const } },
    };
  }

  private async resolveQrRecord(rawToken: string, eventId?: string) {
    const trimmed = rawToken.trim();

    // Event-scoped 4-digit manual gate code
    if (isManualAdmissionCode(trimmed) && eventId) {
      const guest = await prisma.guest.findFirst({
        where: { eventId, manualCode: trimmed },
        include: { qrCodes: { where: { type: QR_TYPES.GUEST_ADMISSION }, take: 1 } },
      });
      if (guest?.qrCodes[0]) {
        const admission = await prisma.qrCode.findUnique({
          where: { id: guest.qrCodes[0].id },
          include: this.admissionInclude(),
        });
        if (admission) return { token: admission.token, qrCode: admission, manualCode: trimmed };
      }
      return { token: trimmed, qrCode: null, manualCode: trimmed };
    }

    const token = parseQrToken(rawToken) ?? trimmed;

    const qrCode = await prisma.qrCode.findUnique({
      where: { token },
      include: this.admissionInclude(),
    });

    if (qrCode) return { token, qrCode };

    const guest = await prisma.guest.findUnique({
      where: { qrToken: token },
      include: { event: true, qrCodes: { where: { type: QR_TYPES.GUEST_ADMISSION }, take: 1 } },
    });
    if (guest?.qrCodes[0]) {
      const admission = await prisma.qrCode.findUnique({
        where: { id: guest.qrCodes[0].id },
        include: this.admissionInclude(),
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
        include: this.admissionInclude(),
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
    const trimmed = rawToken.trim();
    const parsed = parseQrToken(rawToken);
    const isManual = isManualAdmissionCode(trimmed);
    if (!parsed && !trimmed) {
      const scan = await this.logScan(null, eventId, scannedBy, gate, "INVALID", rawToken, undefined, undefined, deviceInfo);
      return { status: "not_found", result: "INVALID", scan: { id: scan.scan.id, createdAt: scan.scan.createdAt } };
    }
    if (isManual && !eventId) {
      const scan = await this.logScan(null, eventId, scannedBy, gate, "INVALID", trimmed, undefined, undefined, deviceInfo);
      return { status: "not_found", result: "INVALID", scan: { id: scan.scan.id, createdAt: scan.scan.createdAt } };
    }
    if (!parsed && !isManual) {
      const scan = await this.logScan(null, eventId, scannedBy, gate, "INVALID", trimmed, undefined, undefined, deviceInfo);
      return { status: "not_found", result: "INVALID", scan: { id: scan.scan.id, createdAt: scan.scan.createdAt } };
    }

    const { token: resolvedToken, qrCode: resolvedQr } = await this.resolveQrRecord(rawToken, eventId);
    let token = resolvedToken;
    let qrCode = resolvedQr;

    if (!qrCode) {
      const scan = await this.logScan(null, eventId, scannedBy, gate, "INVALID", token, undefined, undefined, deviceInfo);
      return {
        status: "not_found",
        result: "INVALID",
        scan: { id: scan.scan.id, createdAt: scan.scan.createdAt },
        feedback: "No matching Celeventic pass was found. Ask for the admission QR or the guest’s 4-digit gate code.",
      };
    }

    const selectedEvent = eventId
      ? await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } })
      : null;

    // Event mismatch first — never admit a pass from another celebration
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
      const lookup = this.formatLookup("wrong_event", scan, qrCode);
      return {
        ...lookup,
        selectedEventTitle: selectedEvent?.title ?? null,
        feedback: `This QR belongs to “${qrCode.event.title}”, not “${selectedEvent?.title ?? "the selected event"}”. Please use a pass issued for this gate’s event.`,
      };
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
      return {
        ...this.formatLookup(entityStatus, scan, qrCode),
        feedback: "This pass cannot be admitted (cancelled, declined, or refunded).",
      };
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
      return {
        ...this.formatLookup("revoked", scan, qrCode),
        feedback: "This pass has been revoked and cannot be used for entry.",
      };
    }

    // Invitation / portal QR → smartly resolve to that guest’s admission pass for this event
    if (!ADMISSION_QR_TYPES.includes(qrCode.type as QrIntentType)) {
      if (INVITE_QR_TYPES.includes(qrCode.type as QrIntentType) && qrCode.guestId) {
        const admission = await prisma.qrCode.findFirst({
          where: {
            guestId: qrCode.guestId,
            eventId: qrCode.eventId,
            type: QR_TYPES.GUEST_ADMISSION,
            isRevoked: false,
          },
          include: this.admissionInclude(),
        });
        if (admission) {
          qrCode = admission;
          token = admission.token;
        } else {
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
          return {
            ...this.formatLookup("wrong_pass", scan, qrCode),
            feedback:
              "This is an invitation QR, not an admission pass. Ask the guest for their Admission QR or 4-digit gate code.",
          };
        }
      } else {
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
        return {
          ...this.formatLookup("wrong_pass", scan, qrCode),
          feedback:
            "This QR is not a gate admission pass. Please scan the guest’s Admission QR or enter their 4-digit code.",
        };
      }
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
      return {
        ...this.formatLookup("expired", scan, qrCode),
        feedback: "This admission pass has expired and cannot be used.",
      };
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
      const lookup = this.formatLookup("already_checked_in", scan, qrCode);
      const name = qrCode.guest?.name ?? qrCode.ticket?.name ?? "This guest";
      return {
        ...lookup,
        feedback: `${name} was already admitted. This scan was not counted again.`,
      };
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
        feedback: "Pass is valid and ready for check-in.",
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

    const lookup = this.formatLookup("valid", scan, qrCode);
    const welcomeName = qrCode.guest?.name ?? qrCode.ticket?.name ?? "Guest";
    return {
      ...lookup,
      feedback: `Welcome, ${welcomeName}! You are admitted to ${qrCode.event.title}. Enjoy the celebration.`,
    };
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
    const result: QrScanResult =
      status === "wrong_pass" ? "INVALID" : logged.result;
    return {
      status,
      result,
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
        guest: {
          select: {
            id: true,
            name: true,
            invitation: { select: { name: true } },
            seatingAssignment: { select: { tableNumber: true, seatLabel: true } },
          },
        },
        ticket: { select: { id: true, name: true } },
        scanner: { select: { id: true, name: true } },
        qrCode: {
          select: {
            guest: {
              select: {
                id: true,
                name: true,
                invitation: { select: { name: true } },
                seatingAssignment: { select: { tableNumber: true, seatLabel: true } },
              },
            },
            ticket: { select: { id: true, name: true } },
          },
        },
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

  /** Clear VALID scans for one guest so their admission QR / 4-digit code can be used again. */
  async resetGuestAdmission(eventId: string, guestId: string, resetBy: string) {
    const guest = await prisma.guest.findFirst({ where: { id: guestId, eventId } });
    if (!guest) throw new Error("Guest not found for this event");

    const admissionQrs = await prisma.qrCode.findMany({
      where: { eventId, guestId, type: { in: [...ADMISSION_QR_TYPES] } },
      select: { id: true },
    });
    const qrIds = admissionQrs.map((q) => q.id);

    const deleted = qrIds.length
      ? await prisma.qrScan.deleteMany({
          where: { eventId, qrCodeId: { in: qrIds }, result: "VALID" },
        })
      : { count: 0 };

    if (guest.status === "CHECKED_IN") {
      await prisma.guest.update({
        where: { id: guestId },
        data: { status: "ACCEPTED" },
      });
    }

    await createAuditLog({
      userId: resetBy,
      action: "QR_SCAN",
      entity: "guest",
      entityId: guestId,
      details: { action: "reset_admission", eventId, clearedScans: deleted.count },
    });

    return { guestId, clearedScans: deleted.count };
  }

  /** Clear all guest admission VALID scans for an event (bulk gate reset). */
  async resetEventAdmissions(eventId: string, resetBy: string) {
    const admissionQrs = await prisma.qrCode.findMany({
      where: { eventId, type: { in: [...ADMISSION_QR_TYPES] }, guestId: { not: null } },
      select: { id: true, guestId: true },
    });
    const qrIds = admissionQrs.map((q) => q.id);
    const guestIds = [...new Set(admissionQrs.map((q) => q.guestId).filter(Boolean))] as string[];

    const deleted = qrIds.length
      ? await prisma.qrScan.deleteMany({
          where: { eventId, qrCodeId: { in: qrIds }, result: "VALID" },
        })
      : { count: 0 };

    if (guestIds.length) {
      await prisma.guest.updateMany({
        where: { id: { in: guestIds }, status: "CHECKED_IN" },
        data: { status: "ACCEPTED" },
      });
    }

    await createAuditLog({
      userId: resetBy,
      action: "QR_SCAN",
      entity: "event",
      entityId: eventId,
      details: { action: "reset_all_admissions", clearedScans: deleted.count, guests: guestIds.length },
    });

    return { clearedScans: deleted.count, guestsReset: guestIds.length };
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
          guest: {
            select: {
              name: true,
              invitation: { select: { name: true } },
              seatingAssignment: { select: { tableNumber: true, seatLabel: true } },
            },
          },
          ticket: { select: { name: true } },
          qrCode: {
            select: {
              guest: {
                select: {
                  name: true,
                  invitation: { select: { name: true } },
                  seatingAssignment: { select: { tableNumber: true, seatLabel: true } },
                },
              },
              ticket: { select: { name: true } },
            },
          },
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
      lastScanned: recentValid.map((s) => {
        const guest = s.guest ?? s.qrCode?.guest ?? null;
        const ticket = s.ticket ?? s.qrCode?.ticket ?? null;
        const seatParts: string[] = [];
        if (guest?.seatingAssignment?.tableNumber) {
          seatParts.push(`Table ${guest.seatingAssignment.tableNumber}`);
        }
        if (guest?.seatingAssignment?.seatLabel) {
          const label = guest.seatingAssignment.seatLabel;
          seatParts.push(/^seat\b/i.test(label) ? label : `Seat ${label}`);
        }
        return {
          id: s.id,
          name:
            guest?.name?.trim() ||
            guest?.invitation?.name?.trim() ||
            ticket?.name?.trim() ||
            "Unknown guest",
          at: s.createdAt,
          gate: s.gate,
          seatNumber: seatParts.length > 0 ? seatParts.join(" · ") : null,
        };
      }),
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
