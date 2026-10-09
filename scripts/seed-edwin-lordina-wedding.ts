/**
 * Idempotent Edwin & Lordina invitation.
 * Photographs live in public/templates so a deploy can serve them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
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

/** The published invite keeps its link. Countdown, moments, and no scratch card. */
function withHourglassCountdown(designConfig: unknown): Prisma.InputJsonValue {
  const design =
    designConfig && typeof designConfig === "object" && !Array.isArray(designConfig)
      ? { ...(designConfig as Record<string, unknown>) }
      : {};
  const experience =
    design.experience && typeof design.experience === "object" && !Array.isArray(design.experience)
      ? { ...(design.experience as Record<string, unknown>) }
      : {};
  experience.countdownStyle = "hourglass";
  design.experience = experience;
  Object.assign(design, withoutScratchCard(design));
  const media = Array.isArray(design.media)
    ? (design.media as Array<Record<string, unknown>>).filter((item) => item.role !== "reference")
    : [];
  design.media = [
    ...media,
    ...MOMENTS.map((url) => ({
      url,
      type: "image",
      role: "reference",
      name: "Edwin and Lordina",
    })),
  ];
  return design as Prisma.InputJsonValue;
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

  const published = await prisma.event.findMany({
    where: { title: EVENT_TITLE, NOT: { slug: EVENT_SLUG } },
    select: {
      id: true,
      invitations: {
        orderBy: { createdAt: "asc" },
        select: { id: true, designConfig: true },
      },
    },
  });
  for (const event of published) {
    const invitation = event.invitations[0];
    if (invitation) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { designConfig: withHourglassCountdown(invitation.designConfig) },
      });
    }
    await hideScratchOnEventOrders(prisma, event.id);
    await replaceEventMoments(prisma, event.id);
    await prisma.event.update({
      where: { id: event.id },
      data: { defaultMusicTrackId: songTrack.id },
    });
  }
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
          uniqueLink: INVITE_LINK,
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

  return {
    eventId: event.id,
    eventSlug: event.slug,
    title: event.title,
    organizer: organizer.email,
    invitationId: invitation.id,
    uniqueLink: invitation.uniqueLink,
    inviteUrl: `/invite/${invitation.uniqueLink}`,
  };
}
