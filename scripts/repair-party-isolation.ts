/**
 * Idempotent repair for high-confidence invitation-party mislinks.
 *
 * Default: dry-run. With --apply --only-high:
 *   - attach unique orphan guests to the matching invitation
 *   - move guests whose name uniquely matches another invitation
 *   - fix GuestPass.displayName when it uniquely matches another party label
 *
 * Never merges two invitation parties. Never deletes history.
 *
 * Usage:
 *   npx tsx scripts/repair-party-isolation.ts --dry-run
 *   npx tsx scripts/repair-party-isolation.ts --apply --only-high
 *   npx tsx scripts/repair-party-isolation.ts --apply --only-high --eventId=<id>
 */

import { prisma } from "../src/lib/prisma";
import { createAuditLog } from "../src/lib/audit";
import {
  findMislinkedGuests,
  findPassDisplayMismatches,
  type IsolationFinding,
} from "../src/lib/invitation/party-leakage";
import { ensureInvitationPass } from "../src/services/admission/guest-pass.service";

async function findingsForEvent(eventId: string): Promise<IsolationFinding[]> {
  const invitations = await prisma.invitation.findMany({
    where: { eventId, archivedAt: null },
    select: {
      id: true,
      name: true,
      uniqueLink: true,
      eventId: true,
      guestPasses: {
        orderBy: { tokenVersion: "desc" },
        select: { code: true, status: true, displayName: true, id: true },
      },
    },
  });
  const guests = await prisma.guest.findMany({
    where: { eventId, archivedAt: null },
    select: { id: true, name: true, invitationId: true, archivedAt: true },
  });
  const inviteRefs = invitations.map((i) => ({
    id: i.id,
    name: i.name,
    uniqueLink: i.uniqueLink,
    eventId: i.eventId,
  }));
  return [
    ...findMislinkedGuests({ eventId, invitations: inviteRefs, guests }),
    ...findPassDisplayMismatches({
      eventId,
      invitations: inviteRefs,
      passes: invitations.flatMap((inv) =>
        inv.guestPasses.map((p) => ({
          invitationId: inv.id,
          displayName: p.displayName,
          code: p.code,
          status: p.status,
        }))
      ),
    }),
  ];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const onlyHigh = process.argv.includes("--only-high") || apply;
  const ensurePasses = process.argv.includes("--ensure-passes");
  const eventArg = process.argv.find((a) => a.startsWith("--eventId="));
  const eventIdFilter = eventArg?.slice("--eventId=".length) || null;
  const actorUserId =
    process.argv.find((a) => a.startsWith("--actor="))?.slice("--actor=".length) ||
    "system-party-isolation-repair";

  if (apply && !process.argv.includes("--only-high") && !onlyHigh) {
    console.error("Refusing broad apply without --only-high");
    process.exit(1);
  }

  console.log(
    `[repair-party-isolation] mode=${apply ? "APPLY" : "dry-run"} onlyHigh=${onlyHigh} eventId=${eventIdFilter ?? "ALL"}`
  );

  const events = await prisma.event.findMany({
    where: {
      status: { not: "CANCELLED" },
      ...(eventIdFilter ? { id: eventIdFilter } : {}),
    },
    select: { id: true, title: true },
  });

  let planned = 0;
  let applied = 0;
  let skipped = 0;
  const actions: Array<Record<string, unknown>> = [];

  for (const event of events) {
    const findings = await findingsForEvent(event.id);
    const targets = findings.filter((f) => (onlyHigh ? f.confidence === "high" : true));

    for (const finding of targets) {
      planned++;
      const action = {
        eventId: event.id,
        eventTitle: event.title,
        ...finding,
      };

      if (!apply) {
        actions.push({ ...action, result: "would_apply" });
        continue;
      }

      try {
        if (
          finding.kind === "orphan_guest_no_invitation" &&
          finding.guestId &&
          finding.otherInvitationId
        ) {
          await prisma.guest.update({
            where: { id: finding.guestId },
            data: { invitationId: finding.otherInvitationId },
          });
          await createAuditLog({
            userId: actorUserId,
            action: "UPDATE",
            entity: "guest",
            entityId: finding.guestId,
            details: {
              kind: "party_isolation_attach_orphan",
              eventId: event.id,
              invitationId: finding.otherInvitationId,
              partyId: finding.otherInvitationId,
            },
          });
          applied++;
          actions.push({ ...action, result: "attached_orphan" });
        } else if (
          finding.kind === "guest_name_matches_other_invitation" &&
          finding.guestId &&
          finding.otherInvitationId
        ) {
          await prisma.guest.update({
            where: { id: finding.guestId },
            data: { invitationId: finding.otherInvitationId },
          });
          await createAuditLog({
            userId: actorUserId,
            action: "UPDATE",
            entity: "guest",
            entityId: finding.guestId,
            details: {
              kind: "party_isolation_reattach_guest",
              eventId: event.id,
              fromInvitationId: finding.invitationId,
              toInvitationId: finding.otherInvitationId,
              partyId: finding.otherInvitationId,
            },
          });
          applied++;
          actions.push({ ...action, result: "reattached_guest" });
        } else if (
          finding.kind === "pass_display_matches_other_invitation" &&
          finding.invitationId
        ) {
          const invitation = await prisma.invitation.findUnique({
            where: { id: finding.invitationId },
            select: { name: true },
          });
          if (!invitation) {
            skipped++;
            actions.push({ ...action, result: "skipped_missing_invitation" });
            continue;
          }
          await prisma.guestPass.updateMany({
            where: {
              invitationId: finding.invitationId,
              status: {
                in: [
                  "ACTIVE",
                  "PARTIALLY_ADMITTED",
                  "ADMITTED",
                  "PENDING_SYNC",
                  "CONFLICT",
                  "MANUAL_REVIEW",
                ],
              },
            },
            data: { displayName: invitation.name },
          });
          await createAuditLog({
            userId: actorUserId,
            action: "UPDATE",
            entity: "guest_pass",
            entityId: finding.invitationId,
            details: {
              kind: "party_isolation_fix_pass_display",
              eventId: event.id,
              invitationId: finding.invitationId,
              displayName: invitation.name,
            },
          });
          applied++;
          actions.push({ ...action, result: "fixed_pass_display" });
        } else {
          skipped++;
          actions.push({ ...action, result: "skipped_manual_review" });
        }
      } catch (error) {
        skipped++;
        actions.push({
          ...action,
          result: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (apply && ensurePasses) {
      const invitations = await prisma.invitation.findMany({
        where: { eventId: event.id, archivedAt: null },
        select: { id: true },
      });
      for (const inv of invitations) {
        await ensureInvitationPass(inv.id).catch(() => null);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        events: events.length,
        planned,
        applied,
        skipped,
        sample: actions.slice(0, 80),
        totalActions: actions.length,
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
