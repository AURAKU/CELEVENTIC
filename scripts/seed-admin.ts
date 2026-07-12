/**
 * Idempotent platform admin seed — safe to run on every deploy.
 * npm run seed:admin
 */
import { PrismaClient } from "@prisma/client";
import { ensurePlatformAccounts } from "../src/lib/auth/ensure-platform-accounts";
import { verifyAdminAccount } from "../src/lib/auth/verify-admin-account";

const prisma = new PrismaClient();

async function main() {
  console.log("CELEVENTIC — seed:admin\n");

  const results = await ensurePlatformAccounts(prisma);
  for (const result of results) {
    const action = result.created
      ? "created"
      : result.passwordReset
        ? "updated (password reset)"
        : "updated (role/status only)";
    console.log(`✓ ${result.email} (${result.role}) — ${action}`);
  }

  const adminCheck = await verifyAdminAccount("admin@celeventic.com");
  console.log("\nAdmin verification:");
  for (const check of adminCheck.checks) {
    console.log(`  ${check.passed ? "✓" : "✗"} ${check.message}`);
  }
  if (!adminCheck.healthy) {
    console.error("\nAdmin account is not healthy:", adminCheck.errors.join("; "));
    process.exit(1);
  }
  console.log("\nPlatform admin ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
