import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { ensureEventMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { sharedVendorAccessService } from "@/services/qr-hub/shared-vendor-access.service";
import type { QrHubAssetCard } from "@/lib/qr-hub/types";
import { isCampaignPlaceable } from "@/lib/gifts/gift-placement";
import { companionGiftHeadline, companionGiftOptionalNote, companionGiftTeaser } from "@/lib/gifts/gift-copy";

function qrUrl(target: string, eventId: string, size = 512, mode?: "pass" | "brand") {
  const modeQs = mode ? `&mode=${mode}` : "";
  return `/api/qr/image?data=${encodeURIComponent(target)}&eventId=${encodeURIComponent(eventId)}&size=${size}${modeQs}`;
}

export class EventQrHubService {
  async overview(eventId: string, actorId?: string): Promise<{
    event: { id: string; title: string; slug: string };
    assets: QrHubAssetCard[];
    vendor: Awaited<ReturnType<typeof sharedVendorAccessService.toHubView>> | null;
  }> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        invitations: {
          where: { status: { in: ["PUBLISHED", "APPROVED"] } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { uniqueLink: true },
        },
      },
    });
    if (!event) throw new Error("Event not found");

    await eventQrLinkService.ensureAllStandard(eventId, actorId);
    const links = await prisma.eventQrLink.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const assets: QrHubAssetCard[] = [];

    // Gift — reuse campaign
    const campaign = await giftCampaignService.getByEvent(eventId);
    if (campaign) {
      const { giftUrl, qrImageUrl } = await giftCampaignService.links(campaign);
      const placeable = isCampaignPlaceable(campaign, "companion");
      assets.push({
        kind: "GIFT",
        title: campaign.title || "Gift",
        purpose: "Optional cash gift via Event Gift Campaign",
        enabled: placeable && campaign.status === "ACTIVE",
        statusLabel: campaign.status,
        url: giftUrl,
        qrPreviewUrl: qrImageUrl,
        openStudioHref: `/dashboard/gifts?eventId=${eventId}`,
        printHeading: companionGiftHeadline(campaign.giftType),
        printSupporting: companionGiftTeaser(campaign.giftType),
        printFooter: companionGiftOptionalNote(),
        lastUpdated: campaign.updatedAt.toISOString(),
      });
    } else {
      assets.push({
        kind: "GIFT",
        title: "Gift",
        purpose: "Optional cash gift via Event Gift Campaign",
        enabled: false,
        statusLabel: "NOT_CONFIGURED",
        url: null,
        qrPreviewUrl: null,
        openStudioHref: `/dashboard/gifts?eventId=${eventId}`,
        printHeading: "A Gift, From the Heart",
        printSupporting:
          "Your presence means the most. Should you wish to send a gift, you may do so securely here.",
        printFooter: "Entirely optional · Securely processed",
      });
    }

    // Standard public links
    for (const link of links) {
      if (link.type === "CUSTOM") continue;
      const url = await eventQrLinkService.publicUrl(link);
      assets.push({
        kind:
          link.type === "MENU"
            ? "MENU"
            : link.type === "SEATING_LOOKUP"
              ? "SEATING"
              : link.type === "PROGRAMME"
                ? "PROGRAMME"
                : link.type === "VENUE"
                  ? "VENUE"
                  : link.type === "HELP"
                    ? "HELP"
                    : "COMPANION",
        title: link.title,
        purpose: link.subtitle || link.heading || link.title,
        enabled: link.status === "ACTIVE",
        statusLabel: link.status,
        url,
        qrPreviewUrl: qrUrl(url, eventId),
        printHeading: link.heading,
        printSupporting: link.subtitle,
        printFooter: link.footerText,
        lastUpdated: link.updatedAt.toISOString(),
        meta: { linkId: link.id, publicToken: link.publicToken },
      });
    }

    // Memory
    const memory = await ensureEventMemoryLinks(eventId).catch(() => null);
    assets.push({
      kind: "MEMORY_UPLOAD",
      title: "Memory Upload",
      purpose: "Share photos and videos from your view.",
      enabled: Boolean(memory),
      statusLabel: memory ? "ACTIVE" : "UNAVAILABLE",
      url: memory?.uploadUrl ?? null,
      qrPreviewUrl: memory?.uploadQrImageUrl ?? null,
      openStudioHref: `/dashboard/memory?eventId=${eventId}`,
      printHeading: "Share a Moment",
      printSupporting: "Share photos and videos from your view.",
    });
    assets.push({
      kind: "MEMORY_ALBUM",
      title: "Memory Album",
      purpose: "View moments shared from this celebration.",
      enabled: Boolean(memory),
      statusLabel: memory ? "ACTIVE" : "UNAVAILABLE",
      url: memory?.albumUrl ?? null,
      qrPreviewUrl: memory?.albumQrImageUrl ?? null,
      openStudioHref: `/dashboard/memory?eventId=${eventId}`,
      printHeading: "Live Album",
      printSupporting: "View moments shared from this celebration.",
    });

    // Companion invite path (personalised companion still requires guest token)
    const inviteLink = event.invitations[0]?.uniqueLink;
    if (inviteLink) {
      const base = await getServerAppUrl();
      const companionUrl = `${base}/invite/${inviteLink}/event-day`;
      assets.push({
        kind: "COMPANION",
        title: "Event Companion (landing)",
        purpose: "Public companion landing — personal details still require admission.",
        enabled: true,
        statusLabel: "ACTIVE",
        url: companionUrl,
        qrPreviewUrl: qrUrl(companionUrl, eventId),
        printHeading: "Event Companion",
        printSupporting: "Verify with your pass to unlock personalised experiences.",
        printFooter: "Admission required for personal details",
      });
    }

    // Custom
    for (const link of links.filter((l) => l.type === "CUSTOM")) {
      const url = await eventQrLinkService.publicUrl(link);
      assets.push({
        kind: "CUSTOM",
        title: link.title,
        purpose: link.subtitle || "Custom organiser link",
        enabled: link.status === "ACTIVE",
        statusLabel: link.status,
        url,
        qrPreviewUrl: qrUrl(url, eventId),
        printHeading: link.heading,
        printSupporting: link.subtitle,
        lastUpdated: link.updatedAt.toISOString(),
        meta: { linkId: link.id, external: true },
      });
    }

    const vendor = await sharedVendorAccessService.toHubView(eventId).catch(() => null);
    if (vendor) {
      assets.push({
        kind: "VENDOR",
        title: "Vendor Access Pass",
        purpose: "Reusable shared vendor credential (does not admit guests).",
        enabled: vendor.status === "ACTIVE",
        statusLabel: vendor.status,
        url: vendor.url,
        qrPreviewUrl: vendor.qrPreviewUrl,
        printHeading: "Vendor Access",
        printSupporting: "Shared event credential for authorised vendors and crew.",
        printFooter: `Access Code: ${vendor.manualCode}`,
        meta: {
          manualCode: vendor.manualCode,
          tokenVersion: vendor.tokenVersion,
          variants: vendor.variants.length,
          warning: vendor.warning,
        },
      });
    }

    return { event, assets, vendor };
  }
}

export const eventQrHubService = new EventQrHubService();
