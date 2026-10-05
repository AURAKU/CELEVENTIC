/**
 * Idempotent seed for the two couple invitations that must show on the
 * organiser home next to every other published event. Both use the Forever
 * Afaris wedding template (`forever-afaris-wedding`) with their own copy,
 * photographs, and film. Nothing from the Jeffery & Chelsy wedding is stored.
 *
 *   Kojo & Fafa — slug `kojo-and-fafa`
 *   Edwin & Lordina — slug `edwin-and-lordina`
 *
 * Owned by the Super Admin account so they appear on that dashboard.
 *
 * Run: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/seed-kojo-fafa-wedding.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { generateToken, slugify } from "../src/lib/utils";
import { getAppUrlFromEnv } from "../src/lib/app-url";
import { SERAPHINE_TRADITIONAL_MAPS } from "../src/lib/experience/aurelia-editorial";
import type { InvitationDesignConfig } from "../src/types/invitation-design";
import { isVideoUrl } from "../src/lib/invitation/theme-media-assets";
import { seedEdwinLordinaWedding } from "./seed-edwin-lordina-wedding";
import { DEMO_MEMORY_EVENT_SLUG } from "../src/lib/memory/ensure-event-memory-links";

const EVENT_SLUG = "kojo-and-fafa";
const LAYOUT_SLUG = "forever-afaris-wedding";
const HERO = "/templates/seraphine/hero.jpg";

const COUPLE_ONLY = [
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
];

function loadKojoDesign(): InvitationDesignConfig {
  const designPath = path.join(process.cwd(), "scripts/fixtures/kojo-fafa-design.json");
  const design = JSON.parse(readFileSync(designPath, "utf8")) as InvitationDesignConfig;
  const board = design.studio?.weddingBoard;
  if (board) board.mapUrl = SERAPHINE_TRADITIONAL_MAPS;
  const leaked = COUPLE_ONLY.find((pattern) => pattern.test(JSON.stringify(design)));
  if (leaked) {
    throw new Error(`Kojo design still contains another couple's copy: ${leaked}`);
  }
  return design;
}

async function main() {
  const designConfig = loadKojoDesign();
  const gallery = (designConfig.media ?? []).filter((item) => item.role === "reference");
  const organizer =
    (await prisma.user.findFirst({
      where: { email: "admin@celeventic.com" },
      select: { id: true, name: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, name: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "ORGANIZER"] } },
      select: { id: true, name: true, email: true },
    }));

  if (!organizer) {
    throw new Error("No organiser account found. Run npm run seed:admin first.");
  }

  const startDate = new Date("2026-11-13T10:00:00.000Z");
  const coverImageUrl = HERO;
  const title = "Kojo & Fafa";
  const hostName = "Kojo & Fafa";

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SLUG },
    create: {
      slug: EVENT_SLUG,
      title,
      eventType: "WEDDING",
      hostName,
      description:
        "Together with their families, Kojo and Fafa invite you to celebrate their wedding.",
      startDate,
      venueName: "Westville Homes",
      landmark: "West Legon",
      mapsLink:
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Westville Homes, 20 Onyasia Street, West Legon, Accra, Ghana"),
      dressCode: "Kente or white with a touch of green, then bright airy wedding colours",
      coverImageUrl,
      qrCenterImageUrl: coverImageUrl,
      qrLogoSize: "bold",
      isPublic: true,
      status: "PUBLISHED",
      organizerId: organizer.id,
      pricingType: "FREE",
    },
    update: {
      title,
      hostName,
      coverImageUrl,
      qrCenterImageUrl: coverImageUrl,
      qrLogoSize: "bold",
      status: "PUBLISHED",
      isPublic: true,
      startDate,
      organizerId: organizer.id,
    },
  });

  await prisma.eventMedia.deleteMany({ where: { eventId: event.id } });
  if (gallery.length > 0) {
    await prisma.eventMedia.createMany({
      data: gallery.map((item, index) => ({
        eventId: event.id,
        url: item.url,
        type: item.type === "video" || isVideoUrl(item.url) ? "video" : "image",
        caption: item.name ?? "Kojo & Fafa",
        sortOrder: index,
      })),
    });
  }

  const template = await prisma.eventTemplate.findFirst({
    where: { slug: LAYOUT_SLUG },
    select: { id: true, slug: true },
  });

  await prisma.event.updateMany({
    where: { slug: DEMO_MEMORY_EVENT_SLUG, title: { in: ["Kojo & Fafa", "Enock & Ruth"] } },
    data: { title: "Celeventic Live Album", hostName: "Celeventic", isPublic: false },
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
          message:
            "Together with their families, Kojo and Fafa invite you to celebrate their wedding.",
          templateId: template?.id,
          designConfig: designConfig as unknown as Prisma.InputJsonValue,
          status: "ACTIVE",
          uniqueLink: "kojo-and-fafa",
        },
      })
    : await prisma.invitation.create({
        data: {
          eventId: event.id,
          name: title,
          slug: `${slugify(title)}-${generateToken(6)}`,
          message:
            "Together with their families, Kojo and Fafa invite you to celebrate their wedding.",
          templateId: template?.id,
          designConfig: designConfig as unknown as Prisma.InputJsonValue,
          uniqueLink: "kojo-and-fafa",
          status: "ACTIVE",
        },
      });

  const appUrl = getAppUrlFromEnv();
  const inviteUrl = `${appUrl}/invite/${invitation.uniqueLink}?skipIntro=1`;

  const edwin = await seedEdwinLordinaWedding(prisma, organizer);

  console.log(
    JSON.stringify(
      {
        kojo: {
          eventId: event.id,
          eventSlug: event.slug,
          title: event.title,
          organizer: organizer.email,
          invitationId: invitation.id,
          uniqueLink: invitation.uniqueLink,
          inviteUrl,
          layout: designConfig.layout,
          photos: gallery.length,
        },
        edwin,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
