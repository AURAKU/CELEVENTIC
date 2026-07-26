import { prisma } from "@/lib/prisma";
import {
  BLOCK_TYPE_LABELS,
  getBlockTypesForEventType,
  type BlockContentJson,
  type InvitationBlockDto,
} from "@/lib/invitation-blocks/block-types";

const DEFAULT_VISIBLE: Record<string, boolean> = {
  WELCOME: true,
  COUPLE_INTRO: true,
  COUNTDOWN: true,
  EVENT_DETAILS: true,
  STORY: true,
  GALLERY: true,
  DRESS_CODE: true,
  VENUE_MAPS: true,
  SCHEDULE: false,
  RSVP: true,
  GIFT_REGISTRY: false,
  MENU: false,
  SEATING_INFO: false,
  HOTEL_TRAVEL: false,
  CONTACT_HOST: true,
  QR_GUEST_PASS: true,
  THANK_YOU: true,
  MEMORY_VAULT: false,
  OBITUARY: true,
  TRIBUTE_WALL: true,
  FUNERAL_PROGRAM: true,
  BURIAL_DIRECTIONS: true,
  FAMILY_CONTACTS: true,
  CONTRIBUTION_LINK: false,
  MEMORIAL_GALLERY: true,
  AGENDA: true,
  SPEAKERS: true,
  REGISTRATION: true,
  TICKET_PASS: false,
  VENUE: true,
  SPONSORS: false,
  CERTIFICATE_INFO: false,
};

function mapBlock(row: {
  id: string;
  blockType: string;
  title: string | null;
  subtitle: string | null;
  contentJson: unknown;
  sortOrder: number;
  isVisible: boolean;
  styleVariant: string;
  language: string;
  contents?: { language: string; title: string | null; subtitle: string | null; content: string | null; contentJson: unknown }[];
  media?: { id: string; url: string; type: string; alt: string | null; sortOrder: number }[];
  galleryItems?: { id: string; url: string; caption: string | null; sortOrder: number }[];
}): InvitationBlockDto {
  return {
    id: row.id,
    blockType: row.blockType,
    title: row.title,
    subtitle: row.subtitle,
    contentJson: row.contentJson as BlockContentJson | null,
    sortOrder: row.sortOrder,
    isVisible: row.isVisible,
    styleVariant: row.styleVariant,
    language: row.language,
    contents: row.contents?.map((c) => ({
      language: c.language,
      title: c.title,
      subtitle: c.subtitle,
      content: c.content,
      contentJson: c.contentJson as BlockContentJson | null,
    })),
    media: row.media,
    galleryItems: row.galleryItems,
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Order fields that block copy is generated from. */
export interface BlockContentSource {
  eventTitle?: string | null;
  hostName?: string | null;
  coupleName1?: string | null;
  coupleName2?: string | null;
  deceasedName?: string | null;
  eventDate?: Date | null;
  eventTime?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  mapsLink?: string | null;
  dressCode?: string | null;
  story?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  galleryUrls?: unknown;
}

const blockInclude = {
  contents: true,
  media: { orderBy: { sortOrder: "asc" as const } },
  galleryItems: { orderBy: { sortOrder: "asc" as const } },
};

export class InvitationBlockService {
  async seedTemplates() {
    let order = 0;
    for (const [blockType, meta] of Object.entries(BLOCK_TYPE_LABELS)) {
      await prisma.invitationBlockTemplate.upsert({
        where: { blockType_category: { blockType, category: meta.category } },
        update: {
          titleEn: meta.en,
          titleFr: meta.fr,
          sortOrder: order++,
        },
        create: {
          blockType,
          category: meta.category,
          titleEn: meta.en,
          titleFr: meta.fr,
          sortOrder: order++,
        },
      });
    }
  }

  private buildContentFromOrder(
    blockType: string,
    order: BlockContentSource
  ): BlockContentJson {
    const gallery = (order.galleryUrls as string[] | null) ?? [];
    const dateIso = order.eventDate?.toISOString();

    switch (blockType) {
      case "WELCOME":
        return { body: "We are delighted to invite you to celebrate with us." };
      case "COUPLE_INTRO":
        return {
          highlight:
            order.coupleName1 && order.coupleName2
              ? `${order.coupleName1} & ${order.coupleName2}`
              : order.hostName ?? order.eventTitle ?? "",
        };
      case "COUNTDOWN":
        return { countdownTarget: dateIso };
      case "EVENT_DETAILS":
        return {
          items: [
            { label: "Date", value: order.eventDate ? order.eventDate.toLocaleDateString() : "TBD" },
            { label: "Time", value: order.eventTime ?? "TBD" },
            { label: "Venue", value: order.venueName ?? order.landmark ?? "TBD" },
          ],
        };
      case "STORY":
        return { body: order.story ?? "" };
      case "DRESS_CODE":
        return { body: order.dressCode ?? "" };
      case "VENUE_MAPS":
        return {
          body: order.venueName ?? order.landmark ?? "",
          mapsUrl: order.mapsLink ?? undefined,
        };
      case "CONTACT_HOST":
        return { phone: order.contactPhone ?? undefined, email: order.contactEmail ?? undefined };
      case "OBITUARY":
        return { body: order.story ?? "", highlight: order.deceasedName ?? undefined };
      case "GALLERY":
      case "MEMORIAL_GALLERY":
        return { items: gallery.map((url) => ({ label: url, value: url })) };
      default:
        return {};
    }
  }

  async ensureBlocksForOrder(orderId: string) {
    await this.seedTemplates();
    const existing = await prisma.invitationBlock.count({ where: { invitationOrderId: orderId } });
    if (existing > 0) return this.getBlocksForOrder(orderId);

    const order = await prisma.invitationOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");

    const types = getBlockTypesForEventType(order.eventType).filter((t) => t !== "CUSTOM");
    const blocks: InvitationBlockDto[] = [];

    for (let i = 0; i < types.length; i++) {
      const blockType = types[i];
      const meta = BLOCK_TYPE_LABELS[blockType];
      const contentJson = this.buildContentFromOrder(blockType, order);

      const block = await prisma.invitationBlock.create({
        data: {
          invitationOrderId: orderId,
          blockType,
          title: meta?.en ?? blockType,
          subtitle: null,
          contentJson: contentJson as object,
          sortOrder: i,
          isVisible: DEFAULT_VISIBLE[blockType] ?? false,
          styleVariant: "elegant",
          language: "en",
          contents: {
            create: [
              { language: "en", title: meta?.en, content: contentJson.body },
              { language: "fr", title: meta?.fr, content: contentJson.body },
            ],
          },
        },
        include: blockInclude,
      });

      if (
        (blockType === "GALLERY" || blockType === "MEMORIAL_GALLERY") &&
        Array.isArray(order.galleryUrls)
      ) {
        const urls = order.galleryUrls as string[];
        if (urls.length) {
          await prisma.invitationGalleryItem.createMany({
            data: urls.map((url, idx) => ({
              blockId: block.id,
              url,
              sortOrder: idx,
            })),
          });
        }
      }

      blocks.push(mapBlock(block));
    }

    return blocks;
  }

  /**
   * Re-derive block copy after the host edits event details.
   *
   * Blocks are seeded from the order once, then become hand-editable. A block
   * is only refreshed while its stored content still matches exactly what the
   * *previous* order state would have generated — the moment a host writes
   * their own copy, that block stops following the order.
   */
  async refreshDerivedContent(
    orderId: string,
    previous: BlockContentSource,
    next: BlockContentSource
  ) {
    const blocks = await prisma.invitationBlock.findMany({
      where: { invitationOrderId: orderId },
      include: { galleryItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (blocks.length === 0) return;

    const previousGallery = (previous.galleryUrls as string[] | null) ?? [];
    const nextGallery = (next.galleryUrls as string[] | null) ?? [];
    const galleryChanged = !sameJson(previousGallery, nextGallery);

    for (const block of blocks) {
      const before = this.buildContentFromOrder(block.blockType, previous);
      const after = this.buildContentFromOrder(block.blockType, next);

      if (!sameJson(before, after) && sameJson(block.contentJson ?? {}, before)) {
        await prisma.invitationBlock.update({
          where: { id: block.id },
          data: { contentJson: after as object },
        });
      }

      const isGalleryBlock =
        block.blockType === "GALLERY" || block.blockType === "MEMORIAL_GALLERY";
      if (!isGalleryBlock || !galleryChanged) continue;

      // Same rule for gallery items: only follow the order while the block
      // still mirrors the previous upload list.
      const currentUrls = block.galleryItems.map((g) => g.url);
      if (!sameJson(currentUrls, previousGallery)) continue;

      await prisma.invitationGalleryItem.deleteMany({ where: { blockId: block.id } });
      if (nextGallery.length > 0) {
        await prisma.invitationGalleryItem.createMany({
          data: nextGallery.map((url, i) => ({ blockId: block.id, url, sortOrder: i })),
        });
      }
    }
  }

  async getBlocksForOrder(orderId: string) {
    const rows = await prisma.invitationBlock.findMany({
      where: { invitationOrderId: orderId },
      include: blockInclude,
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(mapBlock);
  }

  async getBlocksForInvitation(invitationId: string) {
    const rows = await prisma.invitationBlock.findMany({
      where: { invitationId, isVisible: true },
      include: blockInclude,
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(mapBlock);
  }

  async createBlock(
    orderId: string,
    data: { blockType: string; title?: string; subtitle?: string; contentJson?: BlockContentJson }
  ) {
    const maxOrder = await prisma.invitationBlock.aggregate({
      where: { invitationOrderId: orderId },
      _max: { sortOrder: true },
    });
    const meta = BLOCK_TYPE_LABELS[data.blockType];
    const block = await prisma.invitationBlock.create({
      data: {
        invitationOrderId: orderId,
        blockType: data.blockType,
        title: data.title ?? meta?.en ?? data.blockType,
        subtitle: data.subtitle,
        contentJson: (data.contentJson ?? {}) as object,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isVisible: true,
        contents: {
          create: [
            { language: "en", title: data.title ?? meta?.en },
            { language: "fr", title: meta?.fr },
          ],
        },
      },
      include: blockInclude,
    });
    return mapBlock(block);
  }

  async updateBlock(
    blockId: string,
    orderId: string,
    data: Partial<{
      title: string;
      subtitle: string;
      contentJson: BlockContentJson;
      isVisible: boolean;
      styleVariant: string;
      language: string;
      galleryUrls: string[];
      mediaUrl: string;
      frTitle: string;
      frSubtitle: string;
      frContent: string;
    }>
  ) {
    const block = await prisma.invitationBlock.findFirst({
      where: { id: blockId, invitationOrderId: orderId },
    });
    if (!block) throw new Error("Block not found");

    const updated = await prisma.invitationBlock.update({
      where: { id: blockId },
      data: {
        title: data.title,
        subtitle: data.subtitle,
        contentJson: data.contentJson as object | undefined,
        isVisible: data.isVisible,
        styleVariant: data.styleVariant,
        language: data.language,
      },
      include: blockInclude,
    });

    if (data.frTitle !== undefined || data.frSubtitle !== undefined || data.frContent !== undefined) {
      await prisma.invitationBlockContent.upsert({
        where: { blockId_language: { blockId, language: "fr" } },
        update: {
          title: data.frTitle,
          subtitle: data.frSubtitle,
          content: data.frContent,
        },
        create: {
          blockId,
          language: "fr",
          title: data.frTitle,
          subtitle: data.frSubtitle,
          content: data.frContent,
        },
      });
    }

    if (data.galleryUrls) {
      await prisma.invitationGalleryItem.deleteMany({ where: { blockId } });
      if (data.galleryUrls.length) {
        await prisma.invitationGalleryItem.createMany({
          data: data.galleryUrls.map((url, i) => ({ blockId, url, sortOrder: i })),
        });
      }
    }

    if (data.mediaUrl) {
      await prisma.invitationMedia.create({
        data: { blockId, url: data.mediaUrl, type: "image", sortOrder: 0 },
      });
    }

    const refreshed = await prisma.invitationBlock.findUnique({
      where: { id: blockId },
      include: blockInclude,
    });
    return mapBlock(refreshed!);
  }

  async deleteBlock(blockId: string, orderId: string) {
    const block = await prisma.invitationBlock.findFirst({
      where: { id: blockId, invitationOrderId: orderId },
    });
    if (!block) throw new Error("Block not found");
    await prisma.invitationBlock.delete({ where: { id: blockId } });
    return { success: true };
  }

  async reorderBlocks(orderId: string, blockIds: string[]) {
    await Promise.all(
      blockIds.map((id, index) =>
        prisma.invitationBlock.updateMany({
          where: { id, invitationOrderId: orderId },
          data: { sortOrder: index },
        })
      )
    );
    return this.getBlocksForOrder(orderId);
  }

  async copyBlocksToInvitation(orderId: string, invitationId: string) {
    const orderBlocks = await prisma.invitationBlock.findMany({
      where: { invitationOrderId: orderId },
      include: { contents: true, media: true, galleryItems: true },
      orderBy: { sortOrder: "asc" },
    });

    await prisma.invitationBlock.deleteMany({ where: { invitationId } });

    for (const src of orderBlocks) {
      const dest = await prisma.invitationBlock.create({
        data: {
          invitationId,
          blockType: src.blockType,
          title: src.title,
          subtitle: src.subtitle,
          contentJson: src.contentJson ?? undefined,
          sortOrder: src.sortOrder,
          isVisible: src.isVisible,
          styleVariant: src.styleVariant,
          language: src.language,
        },
      });

      if (src.contents.length) {
        await prisma.invitationBlockContent.createMany({
          data: src.contents.map((c) => ({
            blockId: dest.id,
            language: c.language,
            title: c.title,
            subtitle: c.subtitle,
            content: c.content,
            contentJson: c.contentJson ?? undefined,
          })),
        });
      }
      if (src.media.length) {
        await prisma.invitationMedia.createMany({
          data: src.media.map((m) => ({
            blockId: dest.id,
            invitationId,
            url: m.url,
            type: m.type,
            alt: m.alt,
            sortOrder: m.sortOrder,
          })),
        });
      }
      if (src.galleryItems.length) {
        await prisma.invitationGalleryItem.createMany({
          data: src.galleryItems.map((g) => ({
            blockId: dest.id,
            url: g.url,
            caption: g.caption,
            sortOrder: g.sortOrder,
          })),
        });
      }
    }
  }

  async getAvailableBlockTypes(eventType: string) {
    await this.seedTemplates();
    const types = getBlockTypesForEventType(eventType);
    return types.map((t) => ({
      blockType: t,
      ...BLOCK_TYPE_LABELS[t],
    }));
  }
}

export const invitationBlockService = new InvitationBlockService();
