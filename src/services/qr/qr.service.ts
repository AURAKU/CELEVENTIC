import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import type { QrScanResult } from "@prisma/client";
import { QR_TYPES, type QrIntentType } from "@/lib/qr/qr-types";
import { qrRoutingService } from "@/services/qr/qr-routing.service";

export class QrService {
  async generateQrDataUrl(targetUrl: string): Promise<string> {
    return QRCode.toDataURL(targetUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#0D9488", light: "#FFFFFF" },
    });
  }

  async generatePortalQr(token: string) {
    return this.generateQrDataUrl(qrRoutingService.qrScanUrl(token));
  }

  async generateVerifyQr(token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return this.generateQrDataUrl(`${appUrl}/admission/${token}`);
  }

  private async createQr(eventId: string, type: QrIntentType, guestId?: string, ticketId?: string) {
    const token = generateToken(24);
    const qrCode = await prisma.qrCode.create({
      data: { eventId, guestId, ticketId, token, type },
    });
    const dataUrl = await this.generatePortalQr(token);
    return { qrCode, dataUrl, token };
  }

  async createGuestInviteQr(eventId: string, guestId: string) {
    const result = await this.createQr(eventId, QR_TYPES.GUEST_INVITE, guestId);
    await prisma.guest.update({ where: { id: guestId }, data: { qrToken: result.token } });
    return result;
  }

  async createGuestAdmissionQr(eventId: string, guestId: string) {
    const result = await this.createQr(eventId, QR_TYPES.GUEST_ADMISSION, guestId);
    const dataUrl = await this.generateVerifyQr(result.token);
    return { ...result, dataUrl };
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

  async createPublicEventQr(eventId: string, invitationId: string) {
    return this.createQr(eventId, QR_TYPES.PUBLIC_EVENT);
  }

  /** @deprecated use createGuestInviteQr */
  async createGuestQr(eventId: string, guestId: string) {
    return this.createGuestInviteQr(eventId, guestId);
  }

  async createTicketQr(eventId: string, ticketId: string) {
    const token = generateToken(24);
    const qrCode = await prisma.qrCode.create({
      data: {
        eventId,
        ticketId,
        token,
        type: "ticket",
      },
    });
    const dataUrl = await this.generateVerifyQr(token);
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
    const dataUrl = await this.generateVerifyQr(qr.token);
    return { qr, dataUrl };
  }

  async verifyQr(token: string, eventId?: string, scannedBy?: string, gate?: string) {
    const qrCode = await prisma.qrCode.findUnique({
      where: { token },
      include: {
        guest: true,
        ticket: true,
        event: true,
        scans: { where: { result: "VALID" }, take: 1 },
      },
    });

    if (!qrCode) {
      return this.logScan(null, eventId, scannedBy, gate, "INVALID", token);
    }

    if (eventId && qrCode.eventId !== eventId) {
      return this.logScan(qrCode.id, qrCode.eventId, scannedBy, gate, "WRONG_EVENT", token, qrCode.guestId ?? undefined, qrCode.ticketId ?? undefined);
    }

    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return this.logScan(qrCode.id, qrCode.eventId, scannedBy, gate, "EXPIRED", token, qrCode.guestId ?? undefined, qrCode.ticketId ?? undefined);
    }

    if (qrCode.scans.length > 0) {
      return this.logScan(qrCode.id, qrCode.eventId, scannedBy, gate, "ALREADY_USED", token, qrCode.guestId ?? undefined, qrCode.ticketId ?? undefined);
    }

    const scan = await this.logScan(
      qrCode.id,
      qrCode.eventId,
      scannedBy,
      gate,
      "VALID",
      token,
      qrCode.guestId ?? undefined,
      qrCode.ticketId ?? undefined
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

    return {
      result: "VALID" as QrScanResult,
      scan,
      guest: qrCode.guest,
      ticket: qrCode.ticket,
      event: qrCode.event,
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
    ticketId?: string
  ) {
    const resolvedEventId = eventId ?? (qrCodeId ? undefined : undefined);

    const scan = await prisma.qrScan.create({
      data: {
        eventId: resolvedEventId ?? (await prisma.qrCode.findUnique({ where: { token } }))?.eventId ?? "",
        qrCodeId: qrCodeId ?? undefined,
        guestId,
        ticketId,
        scannedBy,
        gate,
        result,
      },
    });

    return { result, scan };
  }
}

export const qrService = new QrService();
