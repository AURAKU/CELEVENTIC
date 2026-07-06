/**
 * Ensures demo admin/organizer accounts exist with known passwords on production.
 * Run: npm run db:ensure-admin
 */
import { PrismaClient } from "@prisma/client";
import { ensurePlatformAccounts } from "../src/lib/auth/ensure-platform-accounts";

const prisma = new PrismaClient();

async function main() {
  const results = await ensurePlatformAccounts(prisma);
  for (const result of results) {
    const action = result.created
      ? "created"
      : result.passwordReset
        ? "updated (password reset)"
        : "updated (role/status only)";
    console.log(`✓ ${result.email} (${result.role}) — ${action}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
