#!/usr/bin/env tsx
/**
 * Backfill dual-stage seating:
 * - Ensure every existing seating plan is typed RECEPTION
 * - No ceremony plans are created automatically
 *
 * Usage:
 *   npx tsx scripts/backfill-dual-stage-seating.ts
 *   npx tsx scripts/backfill-dual-stage-seating.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.seatingPlan.findMany({
    select: { id: true, eventId: true, planType: true, name: true },
  });
  console.log(`Found ${plans.length} seating plan(s).`);

  let updated = 0;
  for (const plan of plans) {
    if (plan.planType === "RECEPTION") continue;
    updated += 1;
    console.log(`Would set plan ${plan.id} (${plan.name}) → RECEPTION`);
    if (!dryRun) {
      await prisma.seatingPlan.update({
        where: { id: plan.id },
        data: { planType: "RECEPTION" },
      });
    }
  }

  console.log(
    dryRun
      ? `Dry run complete. ${updated} plan(s) would be normalized to RECEPTION.`
      : `Backfill complete. ${updated} plan(s) normalized to RECEPTION.`
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
