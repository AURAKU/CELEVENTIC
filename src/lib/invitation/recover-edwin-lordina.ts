/**
 * Surgical Edwin & Lordina restore.
 * Recreates only that wedding and the published invitation URLs.
 * Does not restore the whole database or touch other events.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyEdwinPublishedDesign } from "@/lib/invitation/edwin-published-design";
import {
  EDWIN_PUBLIC_INVITE_PATH,
  EDWIN_PUBLISHED_INVITE_LINK,
} from "@/lib/invitation/public-invite-alias";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/** Production event deleted 10 Nov 2026 13:29 UTC. Audit CREATE 5 Oct 2026. */
export const EDWIN_ORIGINAL_EVENT_ID = "cmuvhuhud00rzlav5d5oymjb6";
/** Published guest invitation that RSVPs used as sourceInvitationId. */
export const EDWIN_ORIGINAL_INVITATION_ID = "cmuvhvi4m00t2lav5i3ba7373";
/** Super Admin who published the live event. */
export const EDWIN_ORIGINAL_ORGANIZER_ID = "cmrhu1d9g0000lan2wpp6n6cp";

const EVENT_SLUG = EDWIN_PUBLIC_INVITE_PATH;
const EVENT_TITLE = "Edwin & Lordina";
const HERO = "/templates/edwin-lordina/hero-navy.jpg";
const ORIGINAL_CREATED_AT = new Date("2026-10-05T16:58:27.938Z");
const ORIGINAL_PUBLISHED_AT = new Date("2026-10-05T16:58:29.774Z");
const MOMENTS = [
  "/templates/edwin-lordina/moments/02-gold.jpg",
  "/templates/edwin-lordina/moments/03-sofa.jpg",
  "/templates/edwin-lordina/moments/04-navy.jpg",
  "/templates/edwin-lordina/moments/05-close.jpg",
  "/templates/edwin-lordina/cover-sofa.jpg",
  "/templates/edwin-lordina/moments/07-stool.jpg",
] as const;

const DESCRIPTION =
  "Together with their families, Edwin and Lordina invite you to celebrate a love written by God. Traditional 24 December, white wedding and reception 26 December 2026.";

export function redactId(id: string | null | undefined) {
  if (!id) return null;
  if (id.length <= 8) return `${id.slice(0, 2)}…`;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function isEdwinName(value: string | null | undefined) {
  const text = value?.toLowerCase() ?? "";
  return text.includes("edwin") && text.includes("lordina");
}

function loadDesign(): InvitationDesignConfig {
  const designPath = path.join(process.cwd(), "scripts/fixtures/edwin-lordina-design.json");
  return JSON.parse(readFileSync(designPath, "utf8")) as InvitationDesignConfig;
}

export async function inspectEdwinLordina(client: PrismaClient = prisma) {
  const events = await client.event.findMany({
    where: {
      OR: [
        { id: EDWIN_ORIGINAL_EVENT_ID },
        { slug: EVENT_SLUG },
        { title: EVENT_TITLE },
        { hostName: { contains: "Edwin" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      organizerId: true,
      _count: { select: { guests: true, invitations: true } },
    },
    take: 10,
  });
  const invitations = await client.invitation.findMany({
    where: {
      OR: [
        { id: EDWIN_ORIGINAL_INVITATION_ID },
        { uniqueLink: EDWIN_PUBLISHED_INVITE_LINK },
        { uniqueLink: EDWIN_PUBLIC_INVITE_PATH },
        { slug: EVENT_SLUG },
        { name: { contains: "Edwin" } },
      ],
    },
    select: { id: true, uniqueLink: true, slug: true, status: true, eventId: true, name: true },
    take: 10,
  });
  const orders = await client.invitationOrder.count({
    where: {
      OR: [
        { coupleName1: { contains: "Edwin" } },
        { coupleName2: { contains: "Lordina" } },
        { eventTitle: { contains: "Edwin" } },
        { eventId: EDWIN_ORIGINAL_EVENT_ID },
        { invitationId: EDWIN_ORIGINAL_INVITATION_ID },
      ],
    },
  });
  const deletes = await client.auditLog.findMany({
    where: { entity: "event", action: "DELETE", entityId: EDWIN_ORIGINAL_EVENT_ID },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { entityId: true, createdAt: true, details: true },
  });
  return { events, invitations, orders, deletes };
}

async function resolveOrganizer(client: PrismaClient) {
  const original = await client.user.findUnique({
    where: { id: EDWIN_ORIGINAL_ORGANIZER_ID },
    select: { id: true, email: true, role: true },
  });
  if (original) return original;

  const admin = await client.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true },
  });
  if (admin) return admin;

  throw new Error("No organizer or admin user exists to own the recovered event.");
}

export async function restoreEdwinLordina(client: PrismaClient = prisma) {
  const designConfig = loadDesign();
  const organizer = await resolveOrganizer(client);
  const startDate = new Date("2026-12-24T09:00:00.000Z");
  const endDate = new Date("2026-12-26T16:00:00.000Z");

  const takenLink = await client.invitation.findUnique({
    where: { uniqueLink: EDWIN_PUBLISHED_INVITE_LINK },
    select: { id: true, name: true, event: { select: { title: true, slug: true } } },
  });
  if (takenLink && takenLink.id !== EDWIN_ORIGINAL_INVITATION_ID && !isEdwinName(takenLink.name) && !isEdwinName(takenLink.event.title)) {
    throw new Error("Published Edwin uniqueLink is held by a different invitation. Refusing to overwrite it.");
  }

  const takenSlug = await client.event.findUnique({
    where: { slug: EVENT_SLUG },
    select: { id: true, title: true },
  });
  if (takenSlug && takenSlug.id !== EDWIN_ORIGINAL_EVENT_ID && !isEdwinName(takenSlug.title)) {
    throw new Error("Slug edwin-and-lordina is held by a different event. Refusing to overwrite it.");
  }

  const eventPayload = {
    slug: EVENT_SLUG,
    title: EVENT_TITLE,
    eventType: "WEDDING" as const,
    hostName: EVENT_TITLE,
    description: DESCRIPTION,
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
    status: "PUBLISHED" as const,
    organizerId: organizer.id,
    pricingType: "FREE" as const,
  };

  const existingEvent =
    (await client.event.findUnique({ where: { id: EDWIN_ORIGINAL_EVENT_ID } })) ??
    (takenSlug ? await client.event.findUnique({ where: { id: takenSlug.id } }) : null);

  const event = existingEvent
    ? await client.event.update({
        where: { id: existingEvent.id },
        data: eventPayload,
      })
    : await client.event.create({
        data: {
          id: EDWIN_ORIGINAL_EVENT_ID,
          ...eventPayload,
          createdAt: ORIGINAL_CREATED_AT,
          updatedAt: ORIGINAL_PUBLISHED_AT,
        },
      });

  const existingInvitation =
    takenLink ??
    (await client.invitation.findUnique({
      where: { id: EDWIN_ORIGINAL_INVITATION_ID },
      select: { id: true, name: true, event: { select: { title: true, slug: true } } },
    })) ??
    (await client.invitation.findFirst({
      where: { eventId: event.id, archivedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, event: { select: { title: true, slug: true } } },
    }));

  const invitationPayload = {
    eventId: event.id,
    name: EVENT_TITLE,
    slug: EVENT_SLUG,
    message: DESCRIPTION,
    designConfig: designConfig as unknown as Prisma.InputJsonValue,
    uniqueLink: EDWIN_PUBLISHED_INVITE_LINK,
    status: "ACTIVE" as const,
    postAdmissionEnabled: true,
    archivedAt: null,
  };

  const invitation = existingInvitation
    ? await client.invitation.update({
        where: { id: existingInvitation.id },
        data: invitationPayload,
      })
    : await client.invitation.create({
        data: {
          id: EDWIN_ORIGINAL_INVITATION_ID,
          ...invitationPayload,
          createdAt: ORIGINAL_CREATED_AT,
        },
      });

  const relinked = await client.invitationOrder.updateMany({
    where: {
      archivedAt: null,
      OR: [
        { coupleName1: { contains: "Edwin" } },
        { coupleName2: { contains: "Lordina" } },
        { eventTitle: { contains: "Edwin" } },
        { invitationId: invitation.id },
        { eventId: event.id },
      ],
    },
    data: { eventId: event.id, invitationId: invitation.id },
  });

  const mediaCount = await client.eventMedia.count({ where: { eventId: event.id } });
  if (mediaCount === 0) {
    await client.eventMedia.createMany({
      data: MOMENTS.map((url, index) => ({
        eventId: event.id,
        url,
        type: "image",
        caption: null,
        sortOrder: index,
      })),
    });
  }

  const design = await applyEdwinPublishedDesign(EDWIN_PUBLISHED_INVITE_LINK, client);
  return {
    eventId: event.id,
    eventSlug: event.slug,
    invitationId: invitation.id,
    uniqueLink: invitation.uniqueLink,
    publicPath: EDWIN_PUBLIC_INVITE_PATH,
    ordersRelinked: relinked.count,
    designChanged: design.changed,
    reusedExistingEvent: Boolean(existingEvent),
    reusedExistingInvitation: Boolean(existingInvitation),
  };
}
