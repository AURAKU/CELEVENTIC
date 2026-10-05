import { prisma, isPrismaUnavailableError } from "@/lib/prisma";
import { isAureliaEditorialLayout } from "@/lib/experience/aurelia-editorial";
import {
  allowPreviewGiftBootstrap,
  isPreviewGiftLink,
  previewGiftEventTitle,
} from "@/lib/gifts/gift-placement";
import { ensureDemoMemoryLinks, DEMO_MEMORY_EVENT_SLUG } from "@/lib/memory/ensure-event-memory-links";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { invitationService } from "@/services/invitations/invitation.service";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import type { PublicGiftCampaignView } from "@/lib/gifts/gift-privacy";

export type InviteGiftCheckoutPayload = {
  giftUrl: string;
  qrImageUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  privacyNote: string;
  campaign: PublicGiftCampaignView;
};

/**
 * Same Paystack campaign a published `/invite/{link}` page opens for Aurelia /
 * Seraphine gifts. Preview uniqueLinks (`preview-seraphine-…`) share the demo
 * event so catalog /dev runtimes hit initialize instead of a placeholder.
 */
export async function resolveInviteGiftCheckout(input: {
  uniqueLink?: string | null;
  eventId?: string | null;
  guestQrToken?: string | null;
}): Promise<InviteGiftCheckoutPayload | null> {
  try {
    return await resolveInviteGiftCheckoutUnsafe(input);
  } catch (error) {
    if (isPrismaUnavailableError(error)) return null;
    throw error;
  }
}

async function resolveInviteGiftCheckoutUnsafe(input: {
  uniqueLink?: string | null;
  eventId?: string | null;
  guestQrToken?: string | null;
}): Promise<InviteGiftCheckoutPayload | null> {
  const uniqueLink = input.uniqueLink?.trim() || null;
  const eventId = input.eventId?.trim() || null;
  const guestQrToken = input.guestQrToken?.trim() || null;

  if (uniqueLink && isPreviewGiftLink(uniqueLink)) {
    if (!allowPreviewGiftBootstrap()) return null;
    const memory = await ensureDemoMemoryLinks(previewGiftEventTitle(uniqueLink));
    if (!memory?.eventId) return null;
    return giftCampaignService.resolvePublicInviteCheckout(memory.eventId, {
      autoOpen: true,
      guestQrToken,
    });
  }

  if (uniqueLink) {
    const invitation = await invitationService.getInvitationByLink(uniqueLink);
    if (!invitation) return null;
    if (invitation.status === "EXPIRED" || invitation.event.status === "CANCELLED") {
      return null;
    }
    const design = invitation.designConfig as InvitationDesignConfig | null;
    const layout = design?.layout ?? invitation.template?.slug ?? null;
    return giftCampaignService.resolvePublicInviteCheckout(invitation.event.id, {
      autoOpen: isAureliaEditorialLayout(layout),
      invitationId: invitation.id,
      guestQrToken,
    });
  }

  if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, status: true },
    });
    if (!event || event.status === "CANCELLED") return null;
    const autoOpen = event.slug === DEMO_MEMORY_EVENT_SLUG && allowPreviewGiftBootstrap();
    return giftCampaignService.resolvePublicInviteCheckout(event.id, {
      autoOpen,
      guestQrToken,
    });
  }

  return null;
}
