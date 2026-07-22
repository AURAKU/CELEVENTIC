/**
 * One-shot sync of the invitation catalogue (incl. Studio 2.0 Wave 1
 * templates) into the InvitationCatalogTemplate table. The same sync runs
 * lazily on order-draft creation; this script covers environments that never
 * create drafts (fresh DBs, staging resets).
 *
 * Run: npm run db:seed-wave1
 */
import { invitationOrderService } from "../src/services/invitations/invitation-order.service";
import { prisma } from "../src/lib/prisma";

async function main() {
  await invitationOrderService.ensureCatalogSeeded();
  const wave1 = await prisma.invitationCatalogTemplate.count({
    where: { themeId: { not: null } },
  });
  const total = await prisma.invitationCatalogTemplate.count();
  console.log(`Catalog synced: ${total} templates (${wave1} Studio 2.0 paged templates).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
