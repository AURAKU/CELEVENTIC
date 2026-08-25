#!/usr/bin/env tsx
/**
 * Inspect published funeral invitations — safe diagnostics only (no PII).
 *
 * Usage (on VPS):
 *   cd /var/www/CELEVENTIC
 *   DATABASE_URL="file:./prisma/prod.db" tsx scripts/inspect-live-funeral-invitations.ts
 */
import { PrismaClient } from "@prisma/client";
import { resolveLiveRevealConfiguration } from "@/lib/experience/live-envelope-contract";

const prisma = new PrismaClient();

type DesignJson = {
  layout?: string;
  studio?: { revealMode?: string };
  experience?: { collectionId?: string; openingExperience?: string };
};

function pickDesign(design: unknown): DesignJson {
  if (!design || typeof design !== "object") return {};
  return design as DesignJson;
}

async function main() {
  const orders = await prisma.invitationOrder.findMany({
    where: {
      archivedAt: null,
      OR: [
        { eventType: "FUNERAL" },
        { templateSlug: { contains: "memorial" } },
        { templateSlug: { contains: "funeral" } },
        { templateSlug: { contains: "candle" } },
      ],
    },
    include: {
      invitation: { select: { id: true, uniqueLink: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  console.log("=== Funeral / memorial production orders (safe fields only) ===\n");
  console.log(
    [
      "invitationId".padEnd(28),
      "uniqueLink".padEnd(24),
      "eventTitle".padEnd(30),
      "templateSlug".padEnd(26),
      "layout".padEnd(24),
      "revealMode".padEnd(10),
      "collection".padEnd(10),
      "opening".padEnd(16),
      "mandatory".padEnd(10),
      "showReveal",
    ].join(" | ")
  );
  console.log("-".repeat(220));

  for (const order of orders) {
    const design = pickDesign(order.designConfig);
    const live = resolveLiveRevealConfiguration({
      catalogSlug: order.templateSlug,
      layout: design.layout ?? null,
      eventTitle: order.eventTitle,
      studio: design.studio,
      experience: design.experience,
    });

    const row = [
      (order.invitationId ?? "—").slice(0, 28).padEnd(28),
      (order.invitation?.uniqueLink ?? "—").slice(0, 24).padEnd(24),
      (order.eventTitle ?? "—").slice(0, 30).padEnd(30),
      order.templateSlug.slice(0, 26).padEnd(26),
      (design.layout ?? "—").slice(0, 24).padEnd(24),
      (design.studio?.revealMode ?? "—").slice(0, 10).padEnd(10),
      (design.experience?.collectionId ?? "—").slice(0, 10).padEnd(10),
      (design.experience?.openingExperience ?? "—").slice(0, 16).padEnd(16),
      String(live.mandatoryMemorialEnvelope).padEnd(10),
      String(live.showReveal),
    ];
    console.log(row.join(" | "));
  }

  console.log(`\nTotal rows: ${orders.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
