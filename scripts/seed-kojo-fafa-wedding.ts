/**
 * Idempotent seed for the couple invitations that must show on the organiser
 * home. Kojo & Fafa stay on the live Seraphine design
 * (`seraphine-champagne-wedding`). A second Kojo event is never created, and
 * any extra copy is removed. Edwin & Lordina keep their own wedding template.
 *
 * Run: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/seed-kojo-fafa-wedding.ts
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { generateToken, slugify } from "../src/lib/utils";
import { getAppUrlFromEnv } from "../src/lib/app-url";
import type { InvitationDesignConfig } from "../src/types/invitation-design";
import { isVideoUrl } from "../src/lib/invitation/theme-media-assets";
import { getDefaultDesignConfig } from "../src/lib/invitation-templates";
import { seedEdwinLordinaWedding } from "./seed-edwin-lordina-wedding";
import { DEMO_MEMORY_EVENT_SLUG } from "../src/lib/memory/ensure-event-memory-links";

const EVENT_SLUG = "kojo-and-fafa";
const LAYOUT_SLUG = "seraphine-champagne-wedding";
const HERO = "/templates/seraphine/hero.jpg";
const KOJO_TITLE = "Kojo & Fafa";

function layoutOf(designConfig: unknown): string {
  if (!designConfig || typeof designConfig !== "object") return "";
  const layout = (designConfig as { layout?: unknown }).layout;
  return typeof layout === "string" ? layout : "";
}

const KOJO_RSVP = [
  { name: "Esther", phone: "+233 54 943 6196" },
  { name: "Vivian", phone: "+233 54 556 3915" },
  { name: "Ella", phone: "+233 24 769 0263" },
] as const;

function withKojoRsvp(design: InvitationDesignConfig): InvitationDesignConfig {
  const experience = { ...(design.experience ?? {}) };
  const wedding = {
    ...((experience.aureliaWedding as Record<string, unknown> | undefined) ?? {}),
  };
  const faqs = Array.isArray(wedding.faqs)
    ? (wedding.faqs as Array<Record<string, unknown>>).map((item) =>
        item.id === "contact"
          ? { ...item, answer: "Call or WhatsApp Esther, Vivian, or Ella." }
          : item
      )
    : wedding.faqs;
  const ceremonies = Array.isArray(wedding.ceremonies)
    ? (wedding.ceremonies as Array<Record<string, unknown>>).map((item) =>
        item.id === "white"
          ? {
              ...item,
              timeLabel: "3:00 PM",
              startAtIso: "2026-11-14T15:00:00+00:00",
            }
          : item
      )
    : wedding.ceremonies;
  experience.aureliaWedding = {
    ...wedding,
    rsvpContactsEyebrow: "Call or WhatsApp",
    rsvpContacts: KOJO_RSVP.map((contact) => ({ ...contact })),
    ...(faqs ? { faqs } : {}),
    ...(ceremonies ? { ceremonies } : {}),
  };
  return { ...design, experience };
}

function seraphineDesign(): InvitationDesignConfig {
  const design = getDefaultDesignConfig(LAYOUT_SLUG);
  if (design.layout !== LAYOUT_SLUG) {
    throw new Error(`Kojo design resolved to ${design.layout}, expected ${LAYOUT_SLUG}`);
  }
  return withKojoRsvp(design);
}

async function removeDuplicateKojoEvent(eventId: string) {
  const guests = await prisma.guest.count({ where: { eventId } });
  if (guests > 0) {
    throw new Error(`Refusing to remove Kojo event ${eventId}: it still has ${guests} guests.`);
  }
  await prisma.eventMedia.deleteMany({ where: { eventId } });
  await prisma.invitation.deleteMany({ where: { eventId } });
  await prisma.eventMemorySettings.deleteMany({ where: { eventId } });
  await prisma.eventMemoryToken.deleteMany({ where: { eventId } });
  await prisma.eventGiftCampaign.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
}

async function main() {
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
  const title = KOJO_TITLE;
  const hostName = KOJO_TITLE;
  const description =
    "Together with their families, Kojo and Fafa invite you to celebrate their wedding.";

  const matches = await prisma.event.findMany({
    where: { title: KOJO_TITLE },
    orderBy: { createdAt: "asc" },
    include: {
      invitations: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  const keeper =
    matches.find((item) => layoutOf(item.invitations[0]?.designConfig) === LAYOUT_SLUG) ??
    matches[0];

  for (const extra of matches) {
    if (!keeper || extra.id === keeper.id) continue;
    await removeDuplicateKojoEvent(extra.id);
  }

  const event = keeper
    ? keeper
    : await prisma.event.create({
        data: {
          slug: EVENT_SLUG,
          title,
          eventType: "WEDDING",
          hostName,
          description,
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
      });

  const currentLayout = layoutOf(event.invitations?.[0]?.designConfig);
  const adoptLiveDesign = currentLayout !== LAYOUT_SLUG;
  const designConfig = adoptLiveDesign ? seraphineDesign() : null;
  const gallery = (designConfig?.media ?? []).filter((item) => item.role === "reference");

  if (adoptLiveDesign) {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        title,
        hostName,
        description,
        coverImageUrl,
        qrCenterImageUrl: coverImageUrl,
        qrLogoSize: "bold",
        status: "PUBLISHED",
        isPublic: true,
        startDate,
      },
    });
    await prisma.eventMedia.deleteMany({ where: { eventId: event.id } });
    if (gallery.length > 0) {
      await prisma.eventMedia.createMany({
        data: gallery.map((item, index) => ({
          eventId: event.id,
          url: item.url,
          type: item.type === "video" || isVideoUrl(item.url) ? "video" : "image",
          caption: item.name ?? title,
          sortOrder: index,
        })),
      });
    }
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

  const invitation =
    existing && !adoptLiveDesign
      ? await prisma.invitation.update({
          where: { id: existing.id },
          data: {
            designConfig: withKojoRsvp(existing.designConfig as InvitationDesignConfig) as unknown as Prisma.InputJsonValue,
          },
        })
      : existing
        ? await prisma.invitation.update({
            where: { id: existing.id },
            data: {
              name: title,
              message: description,
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
              message: description,
              templateId: template?.id,
              designConfig: (designConfig ?? seraphineDesign()) as unknown as Prisma.InputJsonValue,
              uniqueLink: EVENT_SLUG,
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
          layout: designConfig?.layout ?? currentLayout,
          photos: gallery.length,
          removedDuplicates: matches.filter((item) => item.id !== event.id).map((item) => item.slug),
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
