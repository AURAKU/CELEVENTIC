import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { EDWIN_PUBLISHED_INVITE_LINK } from "@/lib/invitation/public-invite-alias";

const HERO = "/templates/edwin-lordina/hero-navy.jpg";
const LAYOUT = "forever-afaris-wedding";
const MOMENTS = [
  "/templates/edwin-lordina/moments/02-gold.jpg",
  "/templates/edwin-lordina/moments/03-sofa.jpg",
  "/templates/edwin-lordina/moments/04-navy.jpg",
  "/templates/edwin-lordina/moments/05-close.jpg",
] as const;

export function edwinDesignIsCurrent(design: unknown): boolean {
  const json = JSON.stringify(design ?? {});
  return json.includes("##EdWinsDina26") && json.includes(HERO);
}

export function loadEdwinPublishedDesign(): InvitationDesignConfig {
  const designPath = path.join(process.cwd(), "scripts/fixtures/edwin-lordina-design.json");
  const design = JSON.parse(readFileSync(designPath, "utf8")) as InvitationDesignConfig;
  const leaked = [/jeffery/i, /chelsy/i, /francisca/i, /forever afaris/i].find((pattern) =>
    pattern.test(JSON.stringify(design))
  );
  if (leaked) {
    throw new Error("Edwin fixture still contains another couple's copy");
  }
  if (design.layout !== LAYOUT) {
    throw new Error(`Expected layout ${LAYOUT}`);
  }
  if (!edwinDesignIsCurrent(design)) {
    throw new Error("Edwin fixture is missing the current portrait or gate word");
  }
  return design;
}

function isEdwinLordina(title: string | null | undefined): boolean {
  const value = title?.toLowerCase() ?? "";
  return value.includes("edwin") && value.includes("lordina");
}

let applyQueue: Promise<unknown> = Promise.resolve();

function enqueueApply<T>(work: () => Promise<T>): Promise<T> {
  const run = applyQueue.then(work, work);
  applyQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Replace the stored board for the published Edwin invitation.
 * The guest token is left unchanged. Parallel page and metadata loads share one write.
 */
export function applyEdwinPublishedDesign(
  uniqueLink = EDWIN_PUBLISHED_INVITE_LINK,
  client: PrismaClient = prisma
): Promise<{ uniqueLink: string; orders: number }> {
  return enqueueApply(() => writeEdwinPublishedDesign(uniqueLink, client));
}

async function writeEdwinPublishedDesign(
  uniqueLink: string,
  client: PrismaClient
): Promise<{ uniqueLink: string; orders: number }> {
  const invitation = await client.invitation.findUnique({
    where: { uniqueLink },
    select: {
      id: true,
      uniqueLink: true,
      name: true,
      designConfig: true,
      eventId: true,
      event: { select: { title: true } },
    },
  });
  if (!invitation) {
    throw new Error(`No invitation with unique link ${uniqueLink}`);
  }
  if (!isEdwinLordina(invitation.event.title) && !isEdwinLordina(invitation.name)) {
    throw new Error(`Refusing to update ${uniqueLink}: not Edwin & Lordina`);
  }
  if (edwinDesignIsCurrent(invitation.designConfig)) {
    return { uniqueLink: invitation.uniqueLink, orders: 0 };
  }
  const design = loadEdwinPublishedDesign();

  const orders = await client.invitationOrder.findMany({
    where: {
      archivedAt: null,
      OR: [{ invitationId: invitation.id }, { eventId: invitation.eventId }],
    },
    select: { id: true },
  });
  const catalog = await client.invitationCatalogTemplate.findUnique({
    where: { slug: LAYOUT },
    select: { slug: true },
  });
  const designJson = design as unknown as Prisma.InputJsonValue;

  await client.invitation.update({
    where: { id: invitation.id },
    data: { designConfig: designJson, status: "ACTIVE" },
  });
  await client.event.update({
    where: { id: invitation.eventId },
    data: { coverImageUrl: HERO, qrCenterImageUrl: HERO, qrLogoSize: "bold" },
  });
  for (const order of orders) {
    await client.invitationOrder.update({
      where: { id: order.id },
      data: {
        designConfig: designJson,
        galleryUrls: [...MOMENTS],
        ...(catalog ? { templateSlug: LAYOUT } : {}),
      },
    });
  }
  await client.eventMedia.deleteMany({ where: { eventId: invitation.eventId } });
  await client.eventMedia.createMany({
    data: MOMENTS.map((url, index) => ({
      eventId: invitation.eventId,
      url,
      type: "image",
      caption: "Edwin and Lordina",
      sortOrder: index,
    })),
  });

  return { uniqueLink: invitation.uniqueLink, orders: orders.length };
}
