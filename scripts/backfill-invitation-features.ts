/**
 * Shared Invitation Feature Layer — idempotent backfill for existing invitations.
 *
 * Safe + additive (spec §9): seeds feature-version metadata and, where the event
 * has QR admission enabled, ensures each guest has a unique manual admission code.
 * Never changes invitation URLs, never regenerates existing passes, never
 * duplicates config, never touches RSVP/seating/guest data.
 *
 * Usage:
 *   npm run invitation-features:backfill -- --dry-run
 *   npm run invitation-features:backfill -- --event-id=<id>
 *   npm run invitation-features:backfill -- --limit=20
 *   npm run invitation-features:backfill -- --resume=<invitationId cursor>
 */
import { prisma } from "../src/lib/prisma";
import { ensureGuestManualCode } from "../src/lib/qr/manual-code";
import { FeatureKey } from "../src/lib/blueprints/feature-keys";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`) || a === `--${name}`);
  if (!hit) return undefined;
  return hit.includes("=") ? hit.split("=")[1] : "true";
}

async function main() {
  const dryRun = Boolean(arg("dry-run"));
  const eventId = arg("event-id");
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const resume = arg("resume");

  const manifest: Array<Record<string, unknown>> = [];

  const invitations = await prisma.invitation.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(resume ? { id: { gt: resume } } : {}),
    },
    orderBy: { id: "asc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      eventId: true,
      featureVersion: true,
      lastMigratedAt: true,
      guests: { select: { id: true, manualCode: true } },
    },
  });

  let updated = 0;
  let codesIssued = 0;

  for (const inv of invitations) {
    const qrEnabled = await prisma.eventEnabledFeature.findFirst({
      where: { eventId: inv.eventId, featureKey: FeatureKey.QR_ADMISSION, isEnabled: true },
      select: { id: true },
    });

    const needsVersion = inv.lastMigratedAt == null;
    const guestsNeedingCode = qrEnabled ? inv.guests.filter((g) => !g.manualCode) : [];

    if (!needsVersion && guestsNeedingCode.length === 0) continue;

    const record: Record<string, unknown> = {
      invitationId: inv.id,
      eventId: inv.eventId,
      setVersion: needsVersion,
      manualCodesToIssue: guestsNeedingCode.length,
    };

    if (!dryRun) {
      if (needsVersion) {
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { featureVersion: inv.featureVersion ?? 1, lastMigratedAt: new Date() },
        });
      }
      for (const g of guestsNeedingCode) {
        await ensureGuestManualCode(g.id);
        codesIssued += 1;
      }
    }

    updated += 1;
    manifest.push(record);
  }

  console.log(JSON.stringify({ dryRun, scanned: invitations.length, updated, codesIssued, lastId: invitations.at(-1)?.id ?? null, manifest }, null, 2));
  console.log(`\nBackfill ${dryRun ? "(dry-run) " : ""}complete — ${updated}/${invitations.length} invitations ${dryRun ? "would be " : ""}updated, ${codesIssued} manual codes issued.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
