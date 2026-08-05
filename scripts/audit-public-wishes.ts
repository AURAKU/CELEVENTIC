/**
 * Read-only audit of public guest wishes vs invitation ownership.
 *
 * Default: dry-run / no mutations.
 *
 * Usage:
 *   npx tsx scripts/audit-public-wishes.ts
 *   npx tsx scripts/audit-public-wishes.ts --eventId=<id>
 *   npx tsx scripts/audit-public-wishes.ts --json
 *
 * Never prints phones, emails, tokens, admission codes, or full wish bodies.
 */

import { prisma } from "../src/lib/prisma";

type EventReport = {
  eventId: string;
  title: string;
  total: number;
  approvedVisible: number;
  pending: number;
  rejected: number;
  hiddenOrRemoved: number;
  missingEventOwnership: number;
  invitationEventMismatch: number;
  publicApiWouldReturn: number;
  approvedButPublicZero: boolean;
};

function redactTitle(title: string): string {
  return title.length > 48 ? `${title.slice(0, 45)}…` : title;
}

async function main() {
  const eventArg = process.argv.find((a) => a.startsWith("--eventId="));
  const eventId = eventArg?.slice("--eventId=".length) || null;
  const asJson = process.argv.includes("--json");

  const events = await prisma.event.findMany({
    where: {
      ...(eventId ? { id: eventId } : {}),
      status: { not: "CANCELLED" },
      guestWishes: { some: {} },
    },
    select: { id: true, title: true },
    orderBy: { updatedAt: "desc" },
    take: eventId ? 1 : 200,
  });

  const reports: EventReport[] = [];

  for (const event of events) {
    const wishes = await prisma.invitationGuestWish.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        eventId: true,
        invitationId: true,
        status: true,
        isVisible: true,
        invitation: { select: { eventId: true } },
      },
    });

    let pending = 0;
    let rejected = 0;
    let hiddenOrRemoved = 0;
    let approvedVisible = 0;
    let missingEventOwnership = 0;
    let invitationEventMismatch = 0;

    for (const w of wishes) {
      if (!w.eventId) missingEventOwnership += 1;
      if (w.invitation && w.invitation.eventId !== w.eventId) {
        invitationEventMismatch += 1;
      }
      if (w.status === "APPROVED" && w.isVisible) approvedVisible += 1;
      else if (w.status === "PENDING") pending += 1;
      else if (w.status === "REJECTED") rejected += 1;
      else if (w.status === "HIDDEN" || w.status === "REMOVED" || !w.isVisible) {
        hiddenOrRemoved += 1;
      }
    }

    const publicApiWouldReturn = await prisma.invitationGuestWish.count({
      where: { eventId: event.id, status: "APPROVED", isVisible: true },
    });

    reports.push({
      eventId: event.id,
      title: redactTitle(event.title),
      total: wishes.length,
      approvedVisible,
      pending,
      rejected,
      hiddenOrRemoved,
      missingEventOwnership,
      invitationEventMismatch,
      publicApiWouldReturn,
      approvedButPublicZero: approvedVisible > 0 && publicApiWouldReturn === 0,
    });
  }

  const summary = {
    eventsScanned: reports.length,
    eventsWithApprovedPublic: reports.filter((r) => r.approvedVisible > 0).length,
    eventsWithMismatch: reports.filter((r) => r.invitationEventMismatch > 0).length,
    eventsApprovedButPublicZero: reports.filter((r) => r.approvedButPublicZero).length,
    dryRun: true,
    mutated: false,
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, reports }, null, 2));
  } else {
    console.log("[audit-public-wishes] dry-run / read-only");
    console.log(JSON.stringify(summary, null, 2));
    for (const r of reports.slice(0, 40)) {
      console.log(
        `- ${r.eventId.slice(0, 8)}… "${r.title}" total=${r.total} approved=${r.approvedVisible} pending=${r.pending} rejected=${r.rejected} hidden=${r.hiddenOrRemoved} mismatch=${r.invitationEventMismatch}`
      );
    }
    if (reports.length > 40) console.log(`… +${reports.length - 40} more events`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[audit-public-wishes] failed", err instanceof Error ? err.message : err);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
