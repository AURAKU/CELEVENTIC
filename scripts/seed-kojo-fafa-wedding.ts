/**
 * Idempotent organiser-style seed for the Kojo & Fafa Seraphine wedding.
 *
 * Copies couple photographs into event uploads, then creates or updates:
 *   Event slug `kojo-and-fafa`
 *   Invitation using seraphine-champagne-wedding
 *   journey captions such as "Where it began"
 *
 * Run: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/seed-kojo-fafa-wedding.ts
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { getDefaultDesignConfig } from "../src/lib/invitation-templates";
import { generateToken, slugify } from "../src/lib/utils";
import { getAppUrlFromEnv } from "../src/lib/app-url";
import {
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_JOURNEY_CHAPTERS,
  SERAPHINE_LAYOUT_SLUG,
} from "../src/lib/experience/aurelia-editorial";
import type { InvitationDesignConfig } from "../src/types/invitation-design";
import { isVideoUrl } from "../src/lib/invitation/theme-media-assets";

const EVENT_SLUG = "kojo-and-fafa";
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/events/kojo-fafa");
const PUBLIC_PREFIX = "/uploads/events/kojo-fafa";

function copyJourneyUploads() {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  return SERAPHINE_JOURNEY_CHAPTERS.map((item) => {
    const sourceName = path.basename(item.imageUrl ?? "");
    const dest = path.join(UPLOAD_DIR, sourceName);
    copyFileSync(path.join(process.cwd(), "public", item.imageUrl ?? ""), dest);
    return {
      ...item,
      imageUrl: `${PUBLIC_PREFIX}/${sourceName}`,
    };
  });
}

async function main() {
  const journey = copyJourneyUploads();
  const organizer =
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ORGANIZER"] } },
      select: { id: true, name: true, email: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true, name: true, email: true } }));

  if (!organizer) {
    throw new Error("No organiser account found. Run npm run seed:admin first.");
  }

  const startDate = new Date("2026-11-13T10:00:00.000Z");
  const coverImageUrl = journey[0]?.imageUrl ?? null;
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
    },
  });

  await prisma.eventMedia.deleteMany({ where: { eventId: event.id } });
  await prisma.eventMedia.createMany({
    data: journey.map((item, index) => ({
      eventId: event.id,
      url: item.imageUrl ?? "",
      type: isVideoUrl(item.imageUrl) ? "video" : "image",
      caption: item.title,
      sortOrder: index,
    })),
  });

  const template =
    (await prisma.eventTemplate.findFirst({
      where: { OR: [{ slug: SERAPHINE_CATALOG_SLUG }, { slug: SERAPHINE_LAYOUT_SLUG }] },
      select: { id: true, slug: true },
    })) ??
    (await prisma.invitationCatalogTemplate
      .findFirst({
        where: { slug: SERAPHINE_CATALOG_SLUG },
        select: { id: true, slug: true },
      })
      .then(() => null));

  const baseDesign = getDefaultDesignConfig(SERAPHINE_CATALOG_SLUG);
  const designConfig: InvitationDesignConfig = {
    ...baseDesign,
    experience: {
      ...baseDesign.experience,
      aureliaWedding: {
        ...baseDesign.experience?.aureliaWedding,
        journey,
        storyEyebrow: "Moments",
        storyTitle: "Our Journey",
        storySignature: "Kojo & Fafa",
        partnerOneName: "Kojo",
        partnerTwoName: "Fafa",
        monogram: "K & F",
        heroImageUrl: "/templates/seraphine/hero.jpg",
      },
    },
    media: journey.map((item) => ({
      url: item.imageUrl ?? "",
      type: isVideoUrl(item.imageUrl) ? "video" : "image",
      role: "reference" as const,
      name: item.title,
    })),
  };

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
          uniqueLink: generateToken(32),
          status: "ACTIVE",
        },
      });

  const appUrl = getAppUrlFromEnv();
  const inviteUrl = `${appUrl}/invite/${invitation.uniqueLink}?skipIntro=1`;

  console.log(
    JSON.stringify(
      {
        eventId: event.id,
        eventSlug: event.slug,
        title: event.title,
        organizer: organizer.email,
        invitationId: invitation.id,
        uniqueLink: invitation.uniqueLink,
        inviteUrl,
        photos: journey.length,
        firstCaption: journey[0]?.title,
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
