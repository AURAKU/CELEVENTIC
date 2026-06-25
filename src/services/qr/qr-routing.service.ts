import { prisma } from "@/lib/prisma";
import { invitationAnalyticsService } from "@/services/invitation-os/invitation-analytics.service";
import {
  ADMISSION_QR_TYPES,
  INVITE_QR_TYPES,
  MEMORIAL_QR_TYPES,
  QR_TYPES,
  type QrIntentType,
} from "@/lib/qr/qr-types";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";

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
    return `${getAppUrlFromEnv()}/qr/${token}`;
  }

  inviteUrl(uniqueLink: string, guestToken?: string) {
    const base = `${getAppUrlFromEnv()}/invite/${uniqueLink}`;
    return guestToken ? `${base}?guest=${guestToken}` : base;
  }

  admissionUrl(token: string) {
    return `${getAppUrlFromEnv()}/admission/${token}`;
  }

  memorialUrl(slug: string, hash?: string) {
    const base = `${getAppUrlFromEnv()}/memorial/${slug}`;
    return hash ? `${base}${hash}` : base;
  }

  memoryUploadUrl(token: string) {
    return `${getAppUrlFromEnv()}/memory-upload/${token}`;
  }

  memoryGalleryUrl(token: string) {
    return `${getAppUrlFromEnv()}/memory/${token}`;
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

      if (MEMORIAL_QR_TYPES.includes(type)) {
        const slug = qrCode.event?.slug;
        if (!slug) return { action: "invalid", reason: "Memorial page not found." };

        const hashMap: Partial<Record<QrIntentType, string>> = {
          [QR_TYPES.MEMORIAL_TRIBUTE]: "#tributes",
          [QR_TYPES.MEMORIAL_CONTRIBUTION]: "#contributions",
          [QR_TYPES.MEMORIAL_LIVESTREAM]: "#livestream",
          [QR_TYPES.MEMORIAL_MEMORY]: "#memories",
          [QR_TYPES.MEMORIAL_SEATING]: "#seating",
        };

        await this.logScan(token, qrCode, "memorial");
        return {
          action: "redirect",
          url: this.memorialUrl(slug, hashMap[type]),
          eventId: qrCode.eventId,
          qrType: type,
        };
      }
    }

    const memoryToken = await eventMemoryTokenService.resolveToken(token);
    if (memoryToken) {
      if (memoryToken.type === "UPLOAD") {
        return { action: "redirect", url: this.memoryUploadUrl(token), eventId: memoryToken.eventId };
      }
      if (memoryToken.type === "VIEW") {
        return { action: "redirect", url: this.memoryGalleryUrl(token), eventId: memoryToken.eventId };
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
