/**
 * Backfill Invitation.admittedCount / admissionState from existing guest
 * check-ins (Guest.status = CHECKED_IN). Idempotent and non-destructive — run
 * after applying the Post-Admission schema. Does NOT append AdmissionEvent rows
 * (there is no historical scanner/actor to attribute); it only seeds the
 * projection so counts are correct for already-admitted guests.
 *
 * Usage: npx tsx scripts/backfill-admission-counts.ts [--dry-run]
 */
import { prisma } from "../src/lib/prisma";
import { computeAllowance, summarize } from "../src/lib/admission/admission-logic";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const invitations = await prisma.invitation.findMany({
    select: {
      id: true,
      admittedCount: true,
      admissionState: true,
      admissionAllowance: true,
      guests: { select: { status: true, plusOnes: true } },
    },
  });

  let updated = 0;
  for (const inv of invitations) {
    const allowance = computeAllowance(inv.guests, inv.admissionAllowance);
    const admitted = inv.guests
      .filter((g) => g.status === "CHECKED_IN")
      .reduce((sum, g) => sum + 1 + Math.max(0, g.plusOnes ?? 0), 0);
    const summary = summarize(admitted, allowance);

    if (inv.admittedCount === summary.admittedCount && inv.admissionState === summary.state) {
      continue; // already correct
    }
    updated += 1;
    if (dryRun) {
      console.log(
        `[dry-run] ${inv.id}: ${inv.admittedCount}/${inv.admissionState} → ${summary.admittedCount}/${summary.state}`
      );
      continue;
    }
    await prisma.invitation.update({
      where: { id: inv.id },
      data: { admittedCount: summary.admittedCount, admissionState: summary.state },
    });
  }

  console.log(
    `Backfill complete — ${invitations.length} invitations scanned, ${updated} ${dryRun ? "would be " : ""}updated.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
