/**
 * Backfill Guest Entry Passes for existing invitations.
 *
 * Safe to run repeatedly: issuance is idempotent, so an invitation that
 * already has a live pass is left untouched (its party size is refreshed if
 * guests were added since).
 *
 *   npx tsx scripts/backfill-guest-passes.ts --dry-run
 *   npx tsx scripts/backfill-guest-passes.ts --event <eventId>
 *   npx tsx scripts/backfill-guest-passes.ts --all-events
 *
 * By default only events with QR admission enabled are processed; pass
 * `--all-events` to provision every event ahead of enabling the feature.
 */

import { prisma } from "../src/lib/prisma";
import { ensureInvitationPass } from "../src/services/admission/guest-pass.service";

interface Options {
  dryRun: boolean;
  eventId: string | null;
  allEvents: boolean;
}

function parseArgs(argv: string[]): Options {
  return {
    dryRun: argv.includes("--dry-run"),
    allEvents: argv.includes("--all-events"),
    eventId: (() => {
      const i = argv.indexOf("--event");
      return i >= 0 ? (argv[i + 1] ?? null) : null;
    })(),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const eventFilter = opts.eventId
    ? { id: opts.eventId }
    : opts.allEvents
      ? {}
      : { admissionSettings: { qrAdmissionEnabled: true } };

  const events = await prisma.event.findMany({
    where: eventFilter,
    select: { id: true, title: true, _count: { select: { invitations: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!events.length) {
    console.log(
      "No matching events. Enable QR admission on an event, or re-run with --all-events."
    );
    return;
  }

  console.log(
    `${opts.dryRun ? "[dry run] " : ""}Backfilling passes across ${events.length} event(s)\n`
  );

  let issued = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events) {
    const invitations = await prisma.invitation.findMany({
      where: { eventId: event.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    let eventIssued = 0;
    for (const invitation of invitations) {
      const existing = await prisma.guestPass.count({
        where: {
          invitationId: invitation.id,
          status: { in: ["ACTIVE", "PARTIALLY_ADMITTED", "ADMITTED", "PENDING_SYNC", "CONFLICT", "MANUAL_REVIEW"] },
        },
      });

      if (existing > 0) {
        skipped++;
        continue;
      }
      if (opts.dryRun) {
        eventIssued++;
        issued++;
        continue;
      }

      try {
        const result = await ensureInvitationPass(invitation.id);
        if (result) {
          eventIssued++;
          issued++;
        }
      } catch (error) {
        failed++;
        console.error(
          `  ! ${invitation.name}: ${error instanceof Error ? error.message : "failed"}`
        );
      }
    }

    console.log(
      `  ${event.title} — ${eventIssued} issued / ${invitations.length} invitation(s)`
    );
  }

  console.log(
    `\n${opts.dryRun ? "[dry run] " : ""}Done. issued=${issued} skipped=${skipped} failed=${failed}`
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
