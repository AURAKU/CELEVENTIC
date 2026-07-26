import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { isVideoUrl } from "@/lib/invitation/theme-media-assets";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { revalidateLiveInvite } from "@/lib/invitation/revalidate-live-invite";
import { invitationBlockService } from "@/services/invitations/invitation-block.service";

/**
 * Which slices of the live invitation this edit can affect. Studio autosave
 * fires on a short debounce, so a design-only change must not drag block and
 * media reconciliation along with it.
 */
export interface PublishedSyncScope {
  /** Design tokens, fonts, experience, buttons — anything in `designConfig`. */
  design?: boolean;
  /** Gallery images + videos, cover art. */
  media?: boolean;
  /** Title, date, venue, dress code, contact, story. */
  details?: boolean;
  /** Section blocks (add / remove / reorder / edit). */
  blocks?: boolean;
}

const FULL_SCOPE: Required<PublishedSyncScope> = {
  design: true,
  media: true,
  details: true,
  blocks: true,
};

function normalizeGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const url = entry.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Keeps a live invitation in step with its Studio order.
 *
 * Publishing snapshots the order into `Event` / `EventMedia` / `Invitation`,
 * and the guest page reads that snapshot. Without this service every edit made
 * after publish would stay trapped on the order and guests would keep seeing
 * the day-one version of the invitation.
 */
export class PublishedInvitationSyncService {
  /**
   * Push the order's current state onto its published records.
   * No-ops for orders that were never published.
   */
  async sync(orderId: string, scope: PublishedSyncScope = FULL_SCOPE): Promise<boolean> {
    const order = await prisma.invitationOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { name: true } } },
    });
    if (!order?.invitationId || !order.eventId) return false;

    const invitation = await prisma.invitation.findUnique({
      where: { id: order.invitationId },
      select: { id: true, uniqueLink: true, name: true },
    });
    const event = await prisma.event.findUnique({
      where: { id: order.eventId },
      select: { id: true, slug: true, coverImageUrl: true },
    });
    if (!invitation || !event) return false;

    const gallery = normalizeGallery(order.galleryUrls);
    const hostName =
      order.coupleName1 && order.coupleName2
        ? `${order.coupleName1} & ${order.coupleName2}`
        : (order.hostName ?? order.user.name ?? null);

    if (scope.details) {
      await this.syncEventDetails(event.id, order, hostName);
    }
    if (scope.media) {
      await this.syncEventMedia(event.id, gallery, event.coverImageUrl);
    }
    if (scope.design || scope.media || scope.details) {
      await this.syncInvitationRecord(invitation.id, order, scope);
    }
    if (scope.blocks) {
      await invitationBlockService.copyBlocksToInvitation(orderId, invitation.id);
    }

    await revalidateLiveInvite({ uniqueLink: invitation.uniqueLink, eventSlug: event.slug });
    return true;
  }

  private async syncEventDetails(
    eventId: string,
    order: {
      eventTitle: string | null;
      eventDate: Date | null;
      story: string | null;
      venueName: string | null;
      landmark: string | null;
      mapsLink: string | null;
      dressCode: string | null;
      contactPhone: string | null;
    },
    hostName: string | null
  ) {
    const title = order.eventTitle?.trim();
    await prisma.event.update({
      where: { id: eventId },
      data: {
        // `title`, `startDate` and `hostName` are non-nullable on Event, so an
        // order that has been blanked out keeps the last good published value.
        ...(title ? { title } : {}),
        ...(order.eventDate ? { startDate: order.eventDate } : {}),
        ...(hostName?.trim() ? { hostName: hostName.trim() } : {}),
        description: order.story,
        venueName: order.venueName,
        landmark: order.landmark,
        mapsLink: order.mapsLink,
        dressCode: order.dressCode,
        contactPhone: order.contactPhone,
      },
    });
  }

  /**
   * Reconcile `EventMedia` (what the guest gallery actually reads) against the
   * order's gallery: additions are created, removals are deleted, and reorders
   * are applied in place so captions survive.
   */
  private async syncEventMedia(
    eventId: string,
    gallery: string[],
    currentCoverImageUrl: string | null
  ) {
    const existing = await prisma.eventMedia.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const wanted = new Set(gallery);
    const keepByUrl = new Map<string, (typeof existing)[number]>();
    const removable: string[] = [];

    for (const row of existing) {
      if (!wanted.has(row.url) || keepByUrl.has(row.url)) {
        removable.push(row.id);
        continue;
      }
      keepByUrl.set(row.url, row);
    }

    if (removable.length > 0) {
      await prisma.eventMedia.deleteMany({ where: { id: { in: removable } } });
    }

    for (let i = 0; i < gallery.length; i++) {
      const url = gallery[i];
      const type = isVideoUrl(url) ? "video" : "image";
      const row = keepByUrl.get(url);
      if (!row) {
        await prisma.eventMedia.create({ data: { eventId, url, type, sortOrder: i } });
        continue;
      }
      if (row.sortOrder !== i || row.type !== type) {
        await prisma.eventMedia.update({ where: { id: row.id }, data: { sortOrder: i, type } });
      }
    }

    // Follow the gallery's lead image only while the cover is still whatever we
    // last derived from it — a cover set deliberately elsewhere always wins.
    const previousUrls = existing.map((m) => m.url);
    const coverIsAutoDerived =
      !currentCoverImageUrl || previousUrls.includes(currentCoverImageUrl);
    const nextCover = gallery[0] ?? null;
    if (coverIsAutoDerived && currentCoverImageUrl !== nextCover) {
      await prisma.event.update({
        where: { id: eventId },
        data: { coverImageUrl: nextCover },
      });
    }
  }

  private async syncInvitationRecord(
    invitationId: string,
    order: {
      templateSlug: string;
      designConfig: unknown;
      galleryUrls: unknown;
      eventTitle: string | null;
      story: string | null;
    },
    scope: PublishedSyncScope
  ) {
    const data: Prisma.InvitationUpdateInput = {};

    if (scope.design || scope.media) {
      const designConfig = buildPublishedDesignConfig(order);
      data.designConfig = designConfig as unknown as Prisma.InputJsonValue;
    }
    if (scope.details) {
      const title = order.eventTitle?.trim();
      if (title) data.name = title;
      data.message = order.story;
    }
    if (Object.keys(data).length === 0) return;

    await prisma.invitation.update({ where: { id: invitationId }, data });
  }

  /** Fire-and-forget wrapper: a sync failure must never fail the user's save. */
  async syncQuietly(orderId: string, scope: PublishedSyncScope = FULL_SCOPE): Promise<void> {
    try {
      await this.sync(orderId, scope);
    } catch (error) {
      console.error("[published-invitation-sync] failed", { orderId, scope, error });
    }
  }
}

export const publishedInvitationSyncService = new PublishedInvitationSyncService();
