import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fingerprintToken,
  generateReceiptNumber,
  issueReceiptToken,
  verifyReceiptToken,
} from "@/lib/gifts/tokens";
import { formatMinor } from "@/lib/gifts/money";
import { GIFT_TYPE_LABELS } from "@/lib/gifts/gift-copy";
import { resolveGiftTheme, type GiftTheme } from "@/lib/gifts/gift-theme";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Gift receipts.
 *
 * A receipt is issued once, from an immutable snapshot taken the moment the
 * gift was confirmed. Reading it needs nothing but the signed link, which is
 * how an unauthenticated guest gets proof of payment without us ever showing
 * them anyone else's gift.
 */

export interface GiftReceiptSnapshot {
  receiptNumber: string;
  reference: string;
  issuedAt: string;
  paidAt: string | null;
  amountFormatted: string;
  amountMinor: number;
  currency: string;
  giftTypeLabel: string;
  guestName: string | null;
  isAnonymous: boolean;
  guestMessage: string | null;
  method: string | null;
  event: { title: string; hostName: string; startDate: string | null };
  campaign: { publicToken: string; thankYouTitle: string; thankYouMessage: string };
}

export interface GiftReceiptView {
  snapshot: GiftReceiptSnapshot;
  theme: GiftTheme;
  status: "ISSUED" | "REVOKED";
}

export class GiftReceiptService {
  /** Idempotent — safe to call from any fulfilment path. */
  async ensureReceipt(giftPaymentId: string): Promise<{ token: string; receiptNumber: string }> {
    const existing = await prisma.eventGiftReceipt.findUnique({ where: { giftPaymentId } });
    if (existing) {
      return { token: issueReceiptToken(existing.id).token, receiptNumber: existing.receiptNumber };
    }

    const gift = await prisma.eventGiftPayment.findUnique({
      where: { id: giftPaymentId },
      include: {
        event: { select: { title: true, hostName: true, startDate: true } },
        campaign: {
          select: {
            publicToken: true,
            giftType: true,
            thankYouTitle: true,
            thankYouMessage: true,
          },
        },
      },
    });
    if (!gift) throw new Error("Gift payment not found");
    if (gift.status !== "SUCCESS") {
      throw new Error("A receipt can only be issued for a confirmed gift");
    }

    const receiptId = randomUUID();
    const { token, fingerprint } = issueReceiptToken(receiptId);
    const receiptNumber = generateReceiptNumber();

    const snapshot: GiftReceiptSnapshot = {
      receiptNumber,
      reference: gift.reference,
      issuedAt: new Date().toISOString(),
      paidAt: gift.paidAt ? gift.paidAt.toISOString() : null,
      amountFormatted: formatMinor(gift.amountMinor, gift.currency),
      amountMinor: gift.amountMinor,
      currency: gift.currency,
      giftTypeLabel: GIFT_TYPE_LABELS[gift.giftType],
      guestName: gift.isAnonymous ? null : gift.guestName,
      isAnonymous: gift.isAnonymous,
      guestMessage: gift.guestMessage,
      method: (gift.metadata as { method?: string } | null)?.method ?? null,
      event: {
        title: gift.event.title,
        hostName: gift.event.hostName,
        startDate: gift.event.startDate ? gift.event.startDate.toISOString() : null,
      },
      campaign: {
        publicToken: gift.campaign.publicToken,
        thankYouTitle: gift.campaign.thankYouTitle ?? "Thank You",
        thankYouMessage:
          gift.campaign.thankYouMessage ?? "Your gift has been received with gratitude.",
      },
    };

    await prisma.eventGiftReceipt.create({
      data: {
        id: receiptId,
        giftPaymentId,
        receiptNumber,
        tokenFingerprint: fingerprint,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });

    return { token, receiptNumber };
  }

  /** Re-derive the signed link for a gift the caller has already proven access to. */
  async tokenForPayment(giftPaymentId: string): Promise<string | null> {
    const receipt = await prisma.eventGiftReceipt.findUnique({
      where: { giftPaymentId },
      select: { id: true, revokedAt: true },
    });
    if (!receipt || receipt.revokedAt) return null;
    return issueReceiptToken(receipt.id).token;
  }

  /**
   * Resolve a signed receipt token. Verification is HMAC-first so an invalid
   * signature costs no database round trip, and the stored fingerprint is
   * re-checked so a leaked-then-revoked link stops working.
   */
  async resolveByToken(token: string): Promise<GiftReceiptView | null> {
    const verified = verifyReceiptToken(token);
    if (!verified) return null;

    const receipt = await prisma.eventGiftReceipt.findUnique({
      where: { id: verified.receiptId },
      include: {
        giftPayment: {
          select: {
            id: true,
            eventId: true,
            status: true,
            campaign: {
              select: {
                themePresetId: true,
                themeSource: true,
                invitation: {
                  select: { designConfig: true, template: { select: { slug: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!receipt) return null;
    if (receipt.tokenFingerprint !== fingerprintToken(token)) return null;

    const { theme } = await giftCampaignService.resolveTheme(receipt.giftPayment.eventId, {
      invitationDesign: receipt.giftPayment.campaign.invitation
        ?.designConfig as InvitationDesignConfig | null,
      invitationTemplateSlug: receipt.giftPayment.campaign.invitation?.template?.slug ?? null,
      presetId: receipt.giftPayment.campaign.themePresetId,
      themeSource: receipt.giftPayment.campaign.themeSource,
    });

    // Best-effort view counter; a failure here must not hide the receipt.
    prisma.eventGiftReceipt
      .update({
        where: { id: receipt.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch(() => undefined);

    return {
      snapshot: receipt.snapshot as unknown as GiftReceiptSnapshot,
      theme,
      status: receipt.revokedAt ? "REVOKED" : "ISSUED",
    };
  }

  async revokeForPayment(giftPaymentId: string): Promise<void> {
    await prisma.eventGiftReceipt.updateMany({
      where: { giftPaymentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const giftReceiptService = new GiftReceiptService();

/** Fallback theme so a receipt always renders even if theme resolution fails. */
export const DEFAULT_RECEIPT_THEME = resolveGiftTheme();
