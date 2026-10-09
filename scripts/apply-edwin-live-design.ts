/**
 * Point one published Edwin & Lordina invitation at the current design.
 * The guest link stays as it is, so links already sent keep opening.
 *
 *   npx tsx scripts/apply-edwin-live-design.ts
 *   npx tsx scripts/apply-edwin-live-design.ts --dry-run
 *   npx tsx scripts/apply-edwin-live-design.ts --link ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import type { InvitationDesignConfig } from "../src/types/invitation-design";

const DEFAULT_LINK = "ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK";
const HERO = "/templates/edwin-lordina/hero-navy.jpg";
const LAYOUT = "forever-afaris-wedding";
const MOMENTS = [
  "/templates/edwin-lordina/moments/02-gold.jpg",
  "/templates/edwin-lordina/moments/03-sofa.jpg",
  "/templates/edwin-lordina/moments/04-navy.jpg",
  "/templates/edwin-lordina/moments/05-close.jpg",
] as const;

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  return process.argv[index + 1]?.trim() || null;
}

function loadDesign(): InvitationDesignConfig {
  const designPath = path.join(process.cwd(), "scripts/fixtures/edwin-lordina-design.json");
  const design = JSON.parse(readFileSync(designPath, "utf8")) as InvitationDesignConfig;
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
  ].find((pattern) => pattern.test(JSON.stringify(design)));
  if (leaked) {
    throw new Error(`Edwin design still contains another couple's copy: ${leaked}`);
  }
  if (design.layout !== LAYOUT) {
    throw new Error(`Expected layout ${LAYOUT}, found ${design.layout ?? "none"}`);
  }
  return design;
}

function isEdwinLordina(title: string | null | undefined): boolean {
  const value = title?.toLowerCase() ?? "";
  return value.includes("edwin") && value.includes("lordina");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const uniqueLink = argValue("--link") || DEFAULT_LINK;
  const design = loadDesign();
  const prisma = new PrismaClient();

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { uniqueLink },
      select: {
        id: true,
        uniqueLink: true,
        name: true,
        eventId: true,
        event: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!invitation) {
      throw new Error(`No invitation with unique link ${uniqueLink}`);
    }
    if (!isEdwinLordina(invitation.event.title) && !isEdwinLordina(invitation.name)) {
      throw new Error(
        `Refusing to update ${uniqueLink}: event is "${invitation.event.title}", not Edwin & Lordina`
      );
    }

    const orders = await prisma.invitationOrder.findMany({
      where: {
        archivedAt: null,
        OR: [{ invitationId: invitation.id }, { eventId: invitation.eventId }],
      },
      select: { id: true, templateSlug: true },
    });
    const catalog = await prisma.invitationCatalogTemplate.findUnique({
      where: { slug: LAYOUT },
      select: { slug: true },
    });

    console.log(
      `${dryRun ? "dry-run" : "apply"} ${invitation.uniqueLink} event=${invitation.event.slug} orders=${orders.length}`
    );
    if (dryRun) return;

    const designJson = design as unknown as Prisma.InputJsonValue;
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        designConfig: designJson,
        status: "ACTIVE",
      },
    });
    await prisma.event.update({
      where: { id: invitation.eventId },
      data: {
        coverImageUrl: HERO,
        qrCenterImageUrl: HERO,
        qrLogoSize: "bold",
      },
    });
    for (const order of orders) {
      await prisma.invitationOrder.update({
        where: { id: order.id },
        data: {
          designConfig: designJson,
          galleryUrls: [...MOMENTS],
          ...(catalog ? { templateSlug: LAYOUT } : {}),
        },
      });
    }
    await prisma.eventMedia.deleteMany({ where: { eventId: invitation.eventId } });
    await prisma.eventMedia.createMany({
      data: MOMENTS.map((url, index) => ({
        eventId: invitation.eventId,
        url,
        type: "image",
        caption: "Edwin and Lordina",
        sortOrder: index,
      })),
    });
    console.log(`updated ${invitation.uniqueLink} without changing the guest link`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
