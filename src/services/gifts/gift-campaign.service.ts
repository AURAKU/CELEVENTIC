import type { EventGiftCampaign, EventGiftType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { generateGiftPublicToken } from "@/lib/gifts/tokens";
import {
  DEFAULT_MIN_AMOUNT_MINOR,
  DEFAULT_SUGGESTED_AMOUNTS_MINOR,
  companionGiftHeadline,
  companionGiftOptionalNote,
  companionGiftTeaser,
  defaultGiftTypeForEvent,
  resolveGiftCopy,
} from "@/lib/gifts/gift-copy";
import { parseSuggestedAmounts } from "@/lib/gifts/money";
import { resolveGiftTheme, type GiftTheme } from "@/lib/gifts/gift-theme";
import type { PublicGiftCampaignView } from "@/lib/gifts/gift-privacy";
import {
  buildCompanionGiftUrl,
  isCampaignPlaceable,
  isGuestScopedToCampaignEvent,
} from "@/lib/gifts/gift-placement";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/**
 * Gift campaigns — the organiser-owned configuration behind every gift link.
 *
 * One event can run several campaigns (a shared QR on the printed card plus a
 * personalised link per guest, for instance). Public tokens are the only handle
 * a guest ever sees, and they are unguessable so a printed QR cannot be walked
 * to another couple's page.
 */

export interface CampaignWithContext {
  campaign: EventGiftCampaign;
  event: {
    id: string;
    title: string;
    hostName: string;
    slug: string;
    eventType: string;
    status: string;
    startDate: Date;
  };
  theme: GiftTheme;
  templateSlug: string | null;
}

export interface EnsureCampaignOptions {
  giftType?: EventGiftType;
  invitationId?: string | null;
  createdById?: string | null;
  activate?: boolean;
}

export class GiftCampaignError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GiftCampaignError";
    this.status = status;
  }
}

export class GiftCampaignService {
  /** The event's primary campaign, created on first use. */
  async ensureCampaign(
    eventId: string,
    options: EnsureCampaignOptions = {}
  ): Promise<EventGiftCampaign> {
    const existing = await prisma.eventGiftCampaign.findFirst({
      where: { eventId, status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, eventType: true },
    });
    if (!event) throw new GiftCampaignError("Event not found", 404);

    const giftType = options.giftType ?? defaultGiftTypeForEvent(event.eventType);
    const copy = resolveGiftCopy(giftType);

    return prisma.eventGiftCampaign.create({
      data: {
        eventId,
        invitationId: options.invitationId ?? undefined,
        createdById: options.createdById ?? undefined,
        publicToken: generateGiftPublicToken(),
        giftType,
        status: options.activate ? "ACTIVE" : "DRAFT",
        title: copy.title,
        subtitle: copy.subtitle,
        description: copy.description,
        ctaLabel: copy.ctaLabel,
        thankYouTitle: copy.thankYouTitle,
        thankYouMessage: copy.thankYouMessage,
        suggestedAmounts: DEFAULT_SUGGESTED_AMOUNTS_MINOR,
        minAmountMinor: DEFAULT_MIN_AMOUNT_MINOR,
      },
    });
  }

  async getByEvent(eventId: string): Promise<EventGiftCampaign | null> {
    return prisma.eventGiftCampaign.findFirst({
      where: { eventId, status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Resolve a public token to its campaign, event and inherited theme. Returns
   * null for anything that is not a live, giftable campaign so the route can
   * 404 without leaking whether the token exists.
   */
  async getByPublicToken(publicToken: string): Promise<CampaignWithContext | null> {
    if (typeof publicToken !== "string" || publicToken.length < 8 || publicToken.length > 128) {
      return null;
    }

    const campaign = await prisma.eventGiftCampaign.findUnique({
      where: { publicToken },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            hostName: true,
            slug: true,
            eventType: true,
            status: true,
            startDate: true,
          },
        },
        invitation: {
          select: { id: true, designConfig: true, template: { select: { slug: true } } },
        },
      },
    });

    if (!campaign) return null;
    if (campaign.status === "ARCHIVED" || campaign.status === "DRAFT") return null;
    if (campaign.event.status === "CANCELLED") return null;

    const { theme, templateSlug } = await this.resolveTheme(campaign.eventId, {
      invitationDesign: campaign.invitation?.designConfig as InvitationDesignConfig | null,
      invitationTemplateSlug: campaign.invitation?.template?.slug ?? null,
      presetId: campaign.themePresetId,
      themeSource: campaign.themeSource,
    });

    const { event, invitation: _invitation, ...campaignFields } = campaign;
    void _invitation;

    return {
      campaign: campaignFields as EventGiftCampaign,
      event: { ...event, eventType: String(event.eventType), status: String(event.status) },
      theme,
      templateSlug,
    };
  }

  /**
   * Inherit the invitation template's look. We check the linked invitation
   * first, then the event's most recent published invitation order, and only
   * then fall back to the Forever Afaris preset.
   */
  async resolveTheme(
    eventId: string,
    input: {
      invitationDesign?: InvitationDesignConfig | null;
      invitationTemplateSlug?: string | null;
      presetId?: string | null;
      themeSource?: string | null;
    }
  ): Promise<{ theme: GiftTheme; templateSlug: string | null }> {
    if (input.themeSource === "PRESET") {
      return {
        theme: resolveGiftTheme({ presetId: input.presetId }),
        templateSlug: null,
      };
    }

    let design = input.invitationDesign ?? null;
    let templateSlug = input.invitationTemplateSlug ?? null;

    if (!design || !templateSlug) {
      const { LIVE_PRODUCTION_ORDER_STATUSES } = await import("@/lib/invitation/studio-access");
      const order = await prisma.invitationOrder.findFirst({
        where: {
          eventId,
          archivedAt: null,
          status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
          invitationId: { not: null },
          shareUrl: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        select: { designConfig: true, templateSlug: true },
      });
      if (order) {
        design = design ?? (order.designConfig as InvitationDesignConfig | null);
        templateSlug = templateSlug ?? order.templateSlug;
      }
    }

    return {
      theme: resolveGiftTheme({ design, templateSlug, presetId: input.presetId }),
      templateSlug,
    };
  }

  /**
   * Build the guest-facing payload. Notice what is absent: totals, counts,
   * contributor lists, goals, progress. There is nothing here for one guest to
   * learn about another.
   */
  toPublicView(
    context: CampaignWithContext,
    guest?: { name: string } | null
  ): PublicGiftCampaignView {
    const { campaign, event } = context;
    const copy = resolveGiftCopy(campaign.giftType, campaign);
    const closed = this.resolveClosedReason(campaign);

    return {
      publicToken: campaign.publicToken,
      giftType: campaign.giftType,
      status: closed ? "CLOSED" : "ACTIVE",
      currency: campaign.currency,
      title: copy.title,
      subtitle: copy.subtitle,
      description: copy.description,
      ctaLabel: copy.ctaLabel,
      amountPrompt: copy.amountPrompt,
      messagePrompt: copy.messagePrompt,
      privacyNote: copy.privacyNote,
      coverImageUrl: campaign.coverImageUrl,
      suggestedAmountsMinor: parseSuggestedAmounts(
        campaign.suggestedAmounts,
        DEFAULT_SUGGESTED_AMOUNTS_MINOR
      ),
      minAmountMinor: campaign.minAmountMinor,
      maxAmountMinor: campaign.maxAmountMinor,
      allowCustomAmount: campaign.allowCustomAmount,
      allowGuestMessage: campaign.allowGuestMessage,
      requireGuestName: campaign.requireGuestName,
      requireGuestContact: campaign.requireGuestContact,
      allowAnonymous: campaign.allowAnonymous,
      closedReason: closed,
      event: {
        title: event.title,
        hostName: event.hostName,
        startDate: event.startDate ? event.startDate.toISOString() : null,
        eventType: event.eventType,
      },
      guest: guest?.name ? { name: guest.name } : null,
    };
  }

  resolveClosedReason(campaign: EventGiftCampaign): string | null {
    if (campaign.status === "PAUSED") return "Gifting is paused by the host right now.";
    if (campaign.status === "CLOSED") return "Gifting for this celebration has closed.";
    if (campaign.closesAt && campaign.closesAt.getTime() <= Date.now()) {
      return "Gifting for this celebration has closed.";
    }
    return null;
  }

  /** Only guests already on the event's list can personalise a gift link. */
  async resolvePersonalisedGuest(campaign: EventGiftCampaign, guestToken?: string | null) {
    if (!guestToken || campaign.qrMode !== "PERSONALISED_GIFT_QR") return null;
    const guest = await prisma.guest.findUnique({
      where: { qrToken: guestToken },
      select: { id: true, name: true, email: true, phone: true, eventId: true },
    });
    if (!isGuestScopedToCampaignEvent(guest, campaign.eventId)) return null;
    return guest;
  }

  async links(campaign: EventGiftCampaign) {
    const baseUrl = await getServerAppUrl();
    const giftUrl = `${baseUrl}/gift/${campaign.publicToken}`;
    return {
      giftUrl,
      qrImageUrl: `/api/qr/image?data=${encodeURIComponent(giftUrl)}&eventId=${encodeURIComponent(
        campaign.eventId
      )}&size=512`,
      qrDownloadUrl: `/api/qr/image?data=${encodeURIComponent(
        giftUrl
      )}&eventId=${encodeURIComponent(campaign.eventId)}&size=1024&download=1`,
    };
  }

  /**
   * @deprecated Digital invitation no longer shows gift CTAs. Always null.
   * Kept so leftover callers fail closed instead of leaking a gift section.
   */
  async resolveInvitePlacement(
    _eventId: string,
    _options: { guestQrToken?: string | null } = {}
  ): Promise<{
    giftUrl: string;
    qrImageUrl: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    privacyNote: string;
  } | null> {
    return null;
  }

  /**
   * Public Event Guide gift CTA placement.
   *
   * Uses the legacy `showOnInvitation` column as the Event Guide surface flag.
   * Still requires an ACTIVE, open campaign (never auto-activates DRAFT).
   * Callers must also gate on `GIFT_WALLET` / `isGuestGiftWalletEnabled`.
   */
  async resolveEventGuidePlacement(
    eventId: string,
    options: {
      guestQrToken?: string | null;
      guideReturnUrl?: string | null;
    } = {}
  ): Promise<{
    giftUrl: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    teaser: string;
    privacyNote: string;
  } | null> {
    const campaign = await this.getByEvent(eventId);
    if (!campaign) return null;
    if (!isCampaignPlaceable(campaign, "event-guide")) return null;
    if (this.resolveClosedReason(campaign)) return null;

    const { giftUrl: baseGiftUrl } = await this.links(campaign);
    const giftUrl = buildCompanionGiftUrl(baseGiftUrl, {
      guestQrToken:
        campaign.qrMode === "PERSONALISED_GIFT_QR" ? options.guestQrToken : null,
      companionReturnUrl: options.guideReturnUrl,
    });
    const copy = resolveGiftCopy(campaign.giftType, campaign);

    return {
      giftUrl,
      title: copy.title,
      subtitle: copy.subtitle,
      ctaLabel: copy.ctaLabel || "Send a Gift",
      teaser: companionGiftTeaser(campaign.giftType),
      privacyNote: copy.privacyNote,
    };
  }

  /**
   * Post-admission Event Companion TAKE PART placement.
   *
   * Independent of Event Guide placement — organisers can offer gifting after
   * gate admission without the guide CTA (or the reverse). Still requires an
   * ACTIVE, open campaign (never auto-activates DRAFT).
   * Callers must also gate on `GIFT_WALLET` / `isGuestGiftWalletEnabled`.
   */
  async resolveCompanionPlacement(
    eventId: string,
    options: {
      guestQrToken?: string | null;
      companionReturnUrl?: string | null;
    } = {}
  ): Promise<{
    giftUrl: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    teaser: string;
    headline: string;
    optionalNote: string;
    privacyNote: string;
  } | null> {
    const campaign = await this.getByEvent(eventId);
    if (!campaign) return null;
    if (!isCampaignPlaceable(campaign, "companion")) return null;
    if (this.resolveClosedReason(campaign)) return null;

    const { giftUrl: baseGiftUrl } = await this.links(campaign);
    const giftUrl = buildCompanionGiftUrl(baseGiftUrl, {
      guestQrToken:
        campaign.qrMode === "PERSONALISED_GIFT_QR" ? options.guestQrToken : null,
      companionReturnUrl: options.companionReturnUrl,
    });
    const copy = resolveGiftCopy(campaign.giftType, campaign);

    return {
      giftUrl,
      title: copy.title,
      subtitle: copy.subtitle,
      ctaLabel: copy.ctaLabel || "Send a Gift",
      teaser: companionGiftTeaser(campaign.giftType),
      headline: companionGiftHeadline(campaign.giftType),
      optionalNote: companionGiftOptionalNote(),
      privacyNote: copy.privacyNote,
    };
  }

  async update(
    campaignId: string,
    data: Prisma.EventGiftCampaignUpdateInput
  ): Promise<EventGiftCampaign> {
    return prisma.eventGiftCampaign.update({ where: { id: campaignId }, data });
  }

  /** Rotate a public token when a printed QR has to be invalidated. */
  async rotatePublicToken(campaignId: string): Promise<EventGiftCampaign> {
    return prisma.eventGiftCampaign.update({
      where: { id: campaignId },
      data: { publicToken: generateGiftPublicToken() },
    });
  }
}

export const giftCampaignService = new GiftCampaignService();
