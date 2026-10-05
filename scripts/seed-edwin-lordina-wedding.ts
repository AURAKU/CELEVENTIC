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
  const title = "Edwin & Lordina";
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
