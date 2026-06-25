/**
 * Ensures demo admin/organizer accounts exist with known passwords on production.
 * Run: npm run db:ensure-admin
 */
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ACCOUNTS = [
  { email: "admin@celeventic.com", password: "Admin@123", name: "Super Admin", role: UserRole.SUPER_ADMIN },
  { email: "organizer@celeventic.com", password: "Organizer@123", name: "Demo Organizer", role: UserRole.ORGANIZER },
  { email: "vendor@celeventic.com", password: "Vendor@123", name: "Demo Vendor", role: UserRole.VENDOR },
] as const;

async function main() {
  for (const account of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        role: account.role,
        status: UserStatus.ACTIVE,
        isVerified: true,
        emailVerified: new Date(),
      },
      create: {
        email: account.email,
        name: account.name,
        passwordHash,
        role: account.role,
        status: UserStatus.ACTIVE,
        isVerified: true,
        emailVerified: new Date(),
      },
    });
    console.log(`✓ ${user.email} (${user.role}) — password reset to default`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
