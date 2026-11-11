/**
 * Surgical Edwin & Lordina recovery CLI.
 *
 *   npx tsx scripts/recover-edwin-lordina-event.ts
 *   npx tsx scripts/recover-edwin-lordina-event.ts --apply
 */
import { prisma } from "../src/lib/prisma";
import {
  inspectEdwinLordina,
  restoreEdwinLordina,
  redactId,
} from "../src/lib/invitation/recover-edwin-lordina";
import {
  EDWIN_PUBLIC_INVITE_PATH,
  EDWIN_PUBLISHED_INVITE_LINK,
} from "../src/lib/invitation/public-invite-alias";

async function main() {
  const apply = process.argv.includes("--apply");
  const before = await inspectEdwinLordina();
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        database: process.env.DATABASE_URL?.startsWith("file:") ? "sqlite-file" : "configured",
        events: before.events.map((event) => ({
          id: redactId(event.id),
          slug: event.slug,
          title: event.title,
          status: event.status,
          invitations: event._count.invitations,
          guests: event._count.guests,
        })),
        invitations: before.invitations.map((row) => ({
          id: redactId(row.id),
          uniqueLink: row.uniqueLink === EDWIN_PUBLISHED_INVITE_LINK ? "published-token" : row.uniqueLink,
          slug: row.slug,
          status: row.status,
        })),
        matchingOrders: before.orders,
        recentEventDeletes: before.deletes.map((row) => ({
          entityId: redactId(row.entityId),
          createdAt: row.createdAt,
        })),
      },
      null,
      2
    )
  );

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write Edwin & Lordina records.");
    return;
  }

  const result = await restoreEdwinLordina();
  console.log(
    JSON.stringify(
      {
        restored: true,
        eventId: redactId(result.eventId),
        eventSlug: result.eventSlug,
        invitationId: redactId(result.invitationId),
        uniqueLink: "published-token",
        inviteUrl: `/invite/${EDWIN_PUBLIC_INVITE_PATH}`,
        tokenUrl: `/invite/${EDWIN_PUBLISHED_INVITE_LINK}`,
        ordersRelinked: result.ordersRelinked,
        designChanged: result.designChanged,
        reusedExistingEvent: result.reusedExistingEvent,
        reusedExistingInvitation: result.reusedExistingInvitation,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
