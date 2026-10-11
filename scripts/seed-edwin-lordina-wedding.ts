/**
 * Idempotent Edwin & Lordina invitation.
 * Photographs live in public/templates so a deploy can serve them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { isDuplicateEdwinEvent } from "../src/lib/invitation/edwin-event-identity";
import { EDWIN_PUBLISHED_INVITE_LINK } from "../src/lib/invitation/public-invite-alias";
import { eventService } from "../src/services/events/event.service";
import type { InvitationDesignConfig } from "../src/types/invitation-design";

const EVENT_SLUG = "edwin-and-lordina";
const INVITE_LINK = "edwin-and-lordina";
const HERO = "/templates/edwin-lordina/hero-navy.jpg";
const EVENT_SONG_URL = "/music/edwin-lordina-biblical.mp3";
const EVENT_SONG_DURATION_SEC = 229.72;
const EVENT_TITLE = "Edwin & Lordina";
const MOMENTS = [
  "/templates/edwin-lordina/moments/02-gold.jpg",
  "/templates/edwin-lordina/moments/03-sofa.jpg",
  "/templates/edwin-lordina/moments/04-navy.jpg",
  "/templates/edwin-lordina/moments/05-close.jpg",
  "/templates/edwin-lordina/cover-sofa.jpg",
  "/templates/edwin-lordina/moments/07-stool.jpg",
] as const;

/** Hide the scratch card without touching the rest of a stored board. */
function withoutScratchCard(designConfig: unknown): Record<string, unknown> {
  const design =
    designConfig && typeof designConfig === "object" && !Array.isArray(designConfig)
      ? { ...(designConfig as Record<string, unknown>) }
      : {};
  const studio =
    design.studio && typeof design.studio === "object" && !Array.isArray(design.studio)
      ? { ...(design.studio as Record<string, unknown>) }
      : {};
  const board =
    studio.weddingBoard && typeof studio.weddingBoard === "object" && !Array.isArray(studio.weddingBoard)
      ? { ...(studio.weddingBoard as Record<string, unknown>) }
      : {};
  const features =
    board.features && typeof board.features === "object" && !Array.isArray(board.features)
      ? { ...(board.features as Record<string, unknown>) }
      : {};
  features.scratch = false;
  board.features = features;
  studio.weddingBoard = board;
  design.studio = studio;
  return design;
}

async function hideScratchOnEventOrders(prisma: PrismaClient, eventId: string) {
  const orders = await prisma.invitationOrder.findMany({
    where: { eventId },
    select: { id: true, designConfig: true },
  });
  for (const order of orders) {
    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: { designConfig: withoutScratchCard(order.designConfig) as Prisma.InputJsonValue },
    });
  }
}

async function replaceEventMoments(prisma: PrismaClient, eventId: string) {
  await prisma.eventMedia.deleteMany({ where: { eventId } });
  await prisma.eventMedia.createMany({
    data: MOMENTS.map((url, index) => ({
      eventId,
      url,
      type: "image",
      caption: "Edwin and Lordina",
      sortOrder: index,
    })),
  });
}

export async function seedEdwinLordinaWedding(
  prisma: PrismaClient,
  organizer: { id: string; email: string | null }
) {
  const designPath = path.join(process.cwd(), "scripts/fixtures/edwin-lordina-design.json");
  const designConfig = JSON.parse(readFileSync(designPath, "utf8")) as InvitationDesignConfig;
  const leaked = [
    /jeffery/i,
    /chelsy/i,
    /francisca/i,
    /\bafari\b/i,
    /\bopoku\b/i,
    /subtle class/i,
    /justine kuffour/i,
    /maame yeboah/i,
    /forever afaris/i,
    /ogbojo/i,
  ].find((pattern) => pattern.test(JSON.stringify(designConfig)));
  if (leaked) {
    throw new Error(`Edwin design still contains another couple's copy: ${leaked}`);
  }
  const startDate = new Date("2026-12-24T09:00:00.000Z");
  const endDate = new Date("2026-12-26T16:00:00.000Z");
  const title = EVENT_TITLE;

  const song = await prisma.invitationMusicTrack.findFirst({
    where: { url: EVENT_SONG_URL },
    select: { id: true },
  });
  const songTrack = song
    ? await prisma.invitationMusicTrack.update({
        where: { id: song.id },
        data: {
          title: "Biblical",
          artist: "Calum Scott",
          category: "wedding",
          durationSec: EVENT_SONG_DURATION_SEC,
          isActive: true,
        },
      })
    : await prisma.invitationMusicTrack.create({
        data: {
          title: "Biblical",
          artist: "Calum Scott",
          category: "wedding",
          url: EVENT_SONG_URL,
          durationSec: EVENT_SONG_DURATION_SEC,
          isActive: true,
        },
      });

  const description =
    "Together with their families, Edwin and Lordina invite you to celebrate a love written by God. Traditional 24 December, white wedding and reception 26 December 2026.";

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SLUG },
    create: {
      slug: EVENT_SLUG,
      title,
      eventType: "WEDDING",
      hostName: title,
      description,
      startDate,
      endDate,
      venueName: "Assemblies of God Tema Community 12 TCC",
      landmark: "Tema Community 12",
      mapsLink:
        "https://www.google.com/maps/place/Assemblies+of+God+Ghana+Tema+Christian+Centre/@5.670683,-0.03132,17z",
      contactPhone: "+233243942142",
      dressCode: "Ivory, champagne gold, and navy blue",
      coverImageUrl: HERO,
      qrCenterImageUrl: HERO,
      qrLogoSize: "bold",
      city: "Tema",
      region: "Greater Accra",
      country: "GH",
      isPublic: true,
      status: "PUBLISHED",
      organizerId: organizer.id,
      pricingType: "FREE",
      defaultMusicTrackId: songTrack.id,
    },
    update: {
      title,
      hostName: title,
      description,
      startDate,
      endDate,
      coverImageUrl: HERO,
      qrCenterImageUrl: HERO,
      qrLogoSize: "bold",
      isPublic: true,
      status: "PUBLISHED",
      organizerId: organizer.id,
      defaultMusicTrackId: songTrack.id,
    },
  });

  const existing = await prisma.invitation.findFirst({
    where: { eventId: event.id },
    orderBy: { createdAt: "asc" },
  });

  const invitation = existing
    ? await prisma.invitation.update({
        where: { id: existing.id },
        data: {
          name: title,
          message: description,
          designConfig: designConfig as unknown as Prisma.InputJsonValue,
          status: "ACTIVE",
        },
      })
    : await prisma.invitation.create({
        data: {
          eventId: event.id,
          name: title,
          slug: EVENT_SLUG,
          message: description,
          designConfig: designConfig as unknown as Prisma.InputJsonValue,
          uniqueLink: INVITE_LINK,
          status: "ACTIVE",
        },
      });

  await hideScratchOnEventOrders(prisma, event.id);
  await replaceEventMoments(prisma, event.id);
  const merged = await mergeDuplicateEdwinEvents(prisma, event.id);

  return {
    eventId: event.id,
    eventSlug: event.slug,
    title: event.title,
    organizer: organizer.email,
    invitationId: invitation.id,
    uniqueLink: invitation.uniqueLink,
    inviteUrl: `/invite/${invitation.uniqueLink}`,
    mergedEvents: merged,
  };
}

function spareAdmissionCode(taken: Set<string>): string {
  for (let value = 0; value < 10000; value += 1) {
    const code = String(value).padStart(4, "0");
    if (!taken.has(code)) return code;
  }
  throw new Error("No free admission code while merging Edwin & Lordina");
}

/**
 * Fold every other Edwin & Lordina event into the canonical wedding.
 * Guest links, passes, gifts, and wishes move with them. The extra event row
 * is then removed so the platform list shows one wedding.
 */
export async function mergeDuplicateEdwinEvents(prisma: PrismaClient, canonicalEventId: string) {
  const candidates = await prisma.event.findMany({
    where: { id: { not: canonicalEventId } },
    select: { id: true, slug: true, title: true, hostName: true },
  });
  const duplicates = candidates.filter((event) => isDuplicateEdwinEvent(event, canonicalEventId));
  for (const duplicate of duplicates) {
    await mergeOneEdwinEvent(prisma, canonicalEventId, duplicate.id);
  }
  return duplicates.map((event) => event.slug);
}

async function mergeOneEdwinEvent(prisma: PrismaClient, canonicalEventId: string, duplicateEventId: string) {
  await prisma.invitation.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.guestGroup.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });

  const takenGuestCodes = new Set(
    (
      await prisma.guest.findMany({
        where: { eventId: canonicalEventId, manualCode: { not: null } },
        select: { manualCode: true },
      })
    ).map((guest) => guest.manualCode as string)
  );
  const incomingGuests = await prisma.guest.findMany({
    where: { eventId: duplicateEventId },
    select: { id: true, manualCode: true },
  });
  for (const guest of incomingGuests) {
    const manualCode = guest.manualCode && takenGuestCodes.has(guest.manualCode) ? null : guest.manualCode;
    if (manualCode) takenGuestCodes.add(manualCode);
    await prisma.guest.update({
      where: { id: guest.id },
      data: { eventId: canonicalEventId, manualCode },
    });
  }

  const takenPassCodes = new Set(
    (await prisma.guestPass.findMany({ where: { eventId: canonicalEventId }, select: { code: true } })).map(
      (pass) => pass.code
    )
  );
  const incomingPasses = await prisma.guestPass.findMany({
    where: { eventId: duplicateEventId },
    select: { id: true, code: true },
  });
  for (const pass of incomingPasses) {
    const code = takenPassCodes.has(pass.code) ? spareAdmissionCode(takenPassCodes) : pass.code;
    takenPassCodes.add(code);
    await prisma.guestPass.update({
      where: { id: pass.id },
      data: { eventId: canonicalEventId, code },
    });
  }

  await prisma.qrCode.updateMany({ where: { eventId: duplicateEventId }, data: { eventId: canonicalEventId } });
  await prisma.qrScan.updateMany({ where: { eventId: duplicateEventId }, data: { eventId: canonicalEventId } });
  await prisma.invitationGuestWish.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.eventMemoryUpload.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.eventMemoryLike.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.eventMemoryComment.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.eventMemoryToken.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.eventGiftCampaign.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.eventGiftPayment.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });
  await prisma.invitationOrder.updateMany({
    where: { eventId: duplicateEventId },
    data: { eventId: canonicalEventId },
  });

  const keptMedia = new Set(
    (await prisma.eventMedia.findMany({ where: { eventId: canonicalEventId }, select: { url: true } })).map(
      (item) => item.url
    )
  );
  const extraMedia = await prisma.eventMedia.findMany({
    where: { eventId: duplicateEventId },
    select: { id: true, url: true },
  });
  for (const item of extraMedia) {
    if (keptMedia.has(item.url)) continue;
    keptMedia.add(item.url);
    await prisma.eventMedia.update({ where: { id: item.id }, data: { eventId: canonicalEventId } });
  }

  const guestsLeft = await prisma.guest.count({ where: { eventId: duplicateEventId } });
  const invitationsLeft = await prisma.invitation.count({ where: { eventId: duplicateEventId } });
  if (guestsLeft || invitationsLeft) {
    throw new Error(
      `Edwin & Lordina merge stopped: ${guestsLeft} guests and ${invitationsLeft} invitations were still on ${duplicateEventId}`
    );
  }

  await eventService.deleteEvent(duplicateEventId, { hard: true });
  console.log(
    `[edwin-merge] folded ${duplicateEventId} into ${canonicalEventId}; published link ${EDWIN_PUBLISHED_INVITE_LINK} stays`
  );
}
