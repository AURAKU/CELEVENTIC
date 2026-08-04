/**
 * Dry-run audit for invitation admission identity issues.
 *
 * Usage:
 *   npx tsx scripts/audit-admission-identity.ts --dry-run
 *   npx tsx scripts/audit-admission-identity.ts --dry-run --eventId=<id>
 *
 * Never mutates data.
 */

import { prisma } from "../src/lib/prisma";
import { classifyAdmissionIdentity } from "../src/lib/admission-identity/classify";

const LIVE = new Set([
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
]);

async function main() {
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
  const eventArg = process.argv.find((a) => a.startsWith("--eventId="));
  const eventId = eventArg?.slice("--eventId=".length) || null;

  console.log(`[admission-identity-audit] dry-run=${dryRun} eventId=${eventId ?? "ALL"}`);

  const invitations = await prisma.invitation.findMany({
    where: {
      archivedAt: null,
      ...(eventId ? { eventId } : {}),
    },
    select: {
      id: true,
      name: true,
      uniqueLink: true,
      eventId: true,
      event: { select: { title: true } },
      guestPasses: {
        orderBy: { tokenVersion: "desc" },
        select: { code: true, status: true },
      },
    },
    take: 5000,
  });

  const codeCounts = new Map<string, number>();
  for (const inv of invitations) {
    const live = inv.guestPasses.find((p) => LIVE.has(p.status));
    if (live?.code) {
      const key = `${inv.eventId}:${live.code}`;
      codeCounts.set(key, (codeCounts.get(key) ?? 0) + 1);
    }
  }

  const report: Array<Record<string, unknown>> = [];
  for (const inv of invitations) {
    const live = inv.guestPasses.find((p) => LIVE.has(p.status));
    const latest = inv.guestPasses[0];
    const code = live?.code ?? null;
    const classified = classifyAdmissionIdentity({
      uniqueLink: inv.uniqueLink,
      hasLivePass: Boolean(live),
      admissionCode: code,
      passStatus: (live ?? latest)?.status ?? null,
      codeDuplicated: Boolean(code && (codeCounts.get(`${inv.eventId}:${code}`) ?? 0) > 1),
    });
    if (classified.status === "COMPLETE") continue;
    report.push({
      invitationId: inv.id,
      uniqueLink: inv.uniqueLink,
      eventId: inv.eventId,
      eventTitle: inv.event.title,
      displayName: inv.name,
      status: classified.status,
      issues: classified.issues,
      recommended:
        classified.status === "DUPLICATE_CODE"
          ? "Review manually — do not bulk-regenerate"
          : "POST /api/guests/admission-identity/generate mode=complete",
    });
  }

  console.log(JSON.stringify({ incomplete: report.length, scanned: invitations.length, report }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
