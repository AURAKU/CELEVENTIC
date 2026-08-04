/**
 * Production-wide party isolation + admission identity audit.
 *
 * Scans EVERY active invitation/guest on the database (or one event).
 * Default is dry-run — never mutates.
 *
 * Usage:
 *   npx tsx scripts/audit-party-isolation-live.ts --dry-run
 *   npx tsx scripts/audit-party-isolation-live.ts --dry-run --eventId=<id>
 *   npx tsx scripts/audit-party-isolation-live.ts --dry-run --json > /tmp/isolation-report.json
 */

import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { classifyAdmissionIdentity } from "../src/lib/admission-identity/classify";
import {
  findMislinkedGuests,
  findPassDisplayMismatches,
  type IsolationFinding,
} from "../src/lib/invitation/party-leakage";

const LIVE = new Set([
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
]);

async function main() {
  const eventArg = process.argv.find((a) => a.startsWith("--eventId="));
  const eventId = eventArg?.slice("--eventId=".length) || null;
  const asJson = process.argv.includes("--json");
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const outPath = outArg?.slice("--out=".length);

  const eventWhere = eventId ? { id: eventId } : {};
  const events = await prisma.event.findMany({
    where: { ...eventWhere, status: { not: "CANCELLED" } },
    select: { id: true, title: true, slug: true },
    orderBy: { updatedAt: "desc" },
  });

  const allFindings: IsolationFinding[] = [];
  const incompleteIdentity: Array<Record<string, unknown>> = [];
  let invitationsScanned = 0;
  let guestsScanned = 0;

  for (const event of events) {
    const invitations = await prisma.invitation.findMany({
      where: { eventId: event.id, archivedAt: null },
      select: {
        id: true,
        name: true,
        uniqueLink: true,
        eventId: true,
        guestPasses: {
          orderBy: { tokenVersion: "desc" },
          select: { code: true, status: true, displayName: true },
        },
      },
    });
    invitationsScanned += invitations.length;

    const guests = await prisma.guest.findMany({
      where: { eventId: event.id, archivedAt: null },
      select: { id: true, name: true, invitationId: true, archivedAt: true },
    });
    guestsScanned += guests.length;

    const inviteRefs = invitations.map((i) => ({
      id: i.id,
      name: i.name,
      uniqueLink: i.uniqueLink,
      eventId: i.eventId,
    }));

    allFindings.push(
      ...findMislinkedGuests({ eventId: event.id, invitations: inviteRefs, guests }),
      ...findPassDisplayMismatches({
        eventId: event.id,
        invitations: inviteRefs,
        passes: invitations.flatMap((inv) =>
          inv.guestPasses.map((p) => ({
            invitationId: inv.id,
            displayName: p.displayName,
            code: p.code,
            status: p.status,
          }))
        ),
      })
    );

    const codeCounts = new Map<string, number>();
    for (const inv of invitations) {
      const live = inv.guestPasses.find((p) => LIVE.has(p.status));
      if (live?.code) {
        const key = `${event.id}:${live.code}`;
        codeCounts.set(key, (codeCounts.get(key) ?? 0) + 1);
      }
    }

    for (const inv of invitations) {
      const live = inv.guestPasses.find((p) => LIVE.has(p.status));
      const latest = inv.guestPasses[0];
      const code = live?.code ?? null;
      const classified = classifyAdmissionIdentity({
        uniqueLink: inv.uniqueLink,
        hasLivePass: Boolean(live),
        admissionCode: code,
        passStatus: (live ?? latest)?.status ?? null,
        codeDuplicated: Boolean(code && (codeCounts.get(`${event.id}:${code}`) ?? 0) > 1),
      });

      if (classified.status === "DUPLICATE_CODE") {
        allFindings.push({
          kind: "duplicate_admission_code",
          eventId: event.id,
          invitationId: inv.id,
          uniqueLink: inv.uniqueLink,
          displayName: inv.name,
          detail: `Invitation “${inv.name}” shares admission code ${code} with another party on this event.`,
          recommended: "Regenerate code for one party after manual review",
          confidence: "high",
        });
      }

      if (classified.status !== "COMPLETE") {
        incompleteIdentity.push({
          eventId: event.id,
          eventTitle: event.title,
          invitationId: inv.id,
          name: inv.name,
          uniqueLink: inv.uniqueLink,
          status: classified.status,
          issues: classified.issues,
        });
      }

      if (!live) {
        allFindings.push({
          kind: "invitation_missing_live_pass",
          eventId: event.id,
          invitationId: inv.id,
          uniqueLink: inv.uniqueLink,
          displayName: inv.name,
          detail: `Invitation “${inv.name}” has no live Guest Entry Pass.`,
          recommended: "Complete Admission Identity / ensureInvitationPass",
          confidence: "high",
        });
      } else if (!code?.trim()) {
        allFindings.push({
          kind: "invitation_missing_admission_code",
          eventId: event.id,
          invitationId: inv.id,
          uniqueLink: inv.uniqueLink,
          displayName: inv.name,
          detail: `Invitation “${inv.name}” live pass has no admission code.`,
          recommended: "Generate Admission Number",
          confidence: "high",
        });
      }
    }
  }

  const high = allFindings.filter((f) => f.confidence === "high");
  const medium = allFindings.filter((f) => f.confidence === "medium");
  const byKind = allFindings.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + 1;
    return acc;
  }, {});

  const report = {
    dryRun: true,
    scanned: {
      events: events.length,
      invitations: invitationsScanned,
      guests: guestsScanned,
    },
    summary: {
      isolationFindings: allFindings.length,
      highConfidence: high.length,
      mediumConfidence: medium.length,
      incompleteIdentity: incompleteIdentity.length,
      byKind,
    },
    /** Every cross-party / orphan / pass-label issue across the platform */
    isolationFindings: allFindings,
    /** Every invitation missing QR/code/link completeness */
    incompleteIdentity,
  };

  const text = JSON.stringify(report, null, 2);
  if (outPath) writeFileSync(outPath, text, "utf8");
  if (asJson || outPath) {
    if (asJson) console.log(text);
    else {
      console.log(
        `[party-isolation-live] events=${events.length} invitations=${invitationsScanned} guests=${guestsScanned}`
      );
      console.log(
        `[party-isolation-live] isolation=${allFindings.length} (high=${high.length}) incompleteIdentity=${incompleteIdentity.length}`
      );
      console.log(`[party-isolation-live] wrote ${outPath}`);
    }
  } else {
    console.log("=== Celeventic live party-isolation audit (dry-run) ===");
    console.log(
      `Events ${events.length} · Invitations ${invitationsScanned} · Guests ${guestsScanned}`
    );
    console.log(
      `Isolation findings: ${allFindings.length} (high ${high.length}, medium ${medium.length})`
    );
    console.log(`Incomplete admission identity: ${incompleteIdentity.length}`);
    console.log("By kind:", byKind);
    console.log("\n--- High-confidence isolation (first 40) ---");
    for (const f of high.slice(0, 40)) {
      console.log(`• [${f.kind}] ${f.detail}`);
      console.log(`  → ${f.recommended}`);
    }
    if (high.length > 40) console.log(`  … +${high.length - 40} more`);
    console.log("\n--- Incomplete identity (first 40) ---");
    for (const row of incompleteIdentity.slice(0, 40)) {
      console.log(
        `• ${row.eventTitle} / ${row.name} → ${row.status} (${(row.issues as string[]).join(", ")})`
      );
    }
    if (incompleteIdentity.length > 40) {
      console.log(`  … +${incompleteIdentity.length - 40} more`);
    }
    console.log("\nTip: re-run with --json --out=/tmp/celeventic-isolation.json for the full report.");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
