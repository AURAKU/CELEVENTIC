import { prisma } from "@/lib/prisma";
import { invitationAnalyticsService } from "@/services/invitation-os/invitation-analytics.service";
import { ADMISSION_QR_TYPES, INVITE_QR_TYPES, QR_TYPES, type QrIntentType } from "@/lib/qr/qr-types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface QrResolveResult {
  action: "redirect" | "invalid" | "expired";
  url?: string;
  reason?: string;
  guestId?: string;
  invitationId?: string;
  eventId?: string;
  qrType?: QrIntentType;
}

export class QrRoutingService {
  qrScanUrl(token: string) {
    return `${APP_URL}/qr/${token}`;
  }

  inviteUrl(uniqueLink: string, guestToken?: string) {
    const base = `${APP_URL}/invite/${uniqueLink}`;
    return guestToken ? `${base}?guest=${guestToken}` : base;
  }

  admissionUrl(token: string) {
    return `${APP_URL}/admission/${token}`;
  }

  async resolveScan(token: string): Promise<QrResolveResult> {
    const qrCode = await prisma.qrCode.findUnique({
      where: { token },
      include: {
        guest: { include: { invitation: true } },
        ticket: true,
        event: { include: { invitations: { take: 1 } } },
      },
    });

    if (qrCode) {
      if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
        await this.logScan(token, qrCode, "expired");
        return { action: "expired", reason: "This QR code has expired." };
      }

      const type = qrCode.type as QrIntentType;
      const invitation = qrCode.guest?.invitation ?? qrCode.event?.invitations?.[0];

      if (INVITE_QR_TYPES.includes(type)) {
        const link = invitation?.uniqueLink;
        if (!link) return { action: "invalid", reason: "Invitation not published." };

        const guestToken =
          type === QR_TYPES.PUBLIC_EVENT ? undefined : (qrCode.guest?.qrToken ?? token);

        await this.logScan(token, qrCode, "invite");
        return {
          action: "redirect",
          url: this.inviteUrl(link, guestToken),
          guestId: qrCode.guestId ?? undefined,
          invitationId: invitation?.id,
          eventId: qrCode.eventId,
          qrType: type,
        };
      }

      if (ADMISSION_QR_TYPES.includes(type)) {
        await this.logScan(token, qrCode, "admission");
        return {
          action: "redirect",
          url: this.admissionUrl(token),
          guestId: qrCode.guestId ?? undefined,
          eventId: qrCode.eventId,
          qrType: type,
        };
      }
    }

    // Fallback: guest.qrToken for legacy personalized links
    const guest = await prisma.guest.findFirst({
      where: { qrToken: token },
      include: { invitation: true },
    });

    if (guest?.invitation) {
      await invitationAnalyticsService.track({
        eventType: "INVITE_OPEN",
        invitationId: guest.invitation.id,
        guestId: guest.id,
        metadata: { source: "qr_legacy" },
      });
      return {
        action: "redirect",
        url: this.inviteUrl(guest.invitation.uniqueLink, guest.qrToken),
        guestId: guest.id,
        invitationId: guest.invitation.id,
        eventId: guest.eventId,
        qrType: QR_TYPES.GUEST_INVITE,
      };
    }

    return { action: "invalid", reason: "This link is invalid or has been revoked." };
  }

  private async logScan(
    token: string,
    qrCode: { id: string; eventId: string; guestId: string | null; type: string },
    intent: string
  ) {
    await prisma.qrScan.create({
      data: {
        eventId: qrCode.eventId,
        qrCodeId: qrCode.id,
        guestId: qrCode.guestId ?? undefined,
        result: "VALID",
        gate: `qr_portal:${intent}`,
        deviceInfo: token.slice(0, 8),
      },
    });

    if (qrCode.guestId) {
      const guest = await prisma.guest.findUnique({
        where: { id: qrCode.guestId },
        include: { invitation: true },
      });
      if (guest?.invitationId) {
        await invitationAnalyticsService.trackInviteOpen(guest.invitationId, guest.id);
      }
    }
  }
}

export const qrRoutingService = new QrRoutingService();
