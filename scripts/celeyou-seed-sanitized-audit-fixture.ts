/**
 * Builds a sanitized local SQLite fixture for subscriber-protection audits.
 * Synthetic paid shapes only. Not a production export.
 *
 * Usage:
 *   cp prisma/dev.db /tmp/celeyou-sanitized-audit.db
 *   DATABASE_URL="file:/tmp/celeyou-sanitized-audit.db" npx tsx scripts/celeyou-seed-sanitized-audit-fixture.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = Date.now();
  const cards = await prisma.digitalBusinessCard.findMany({
    select: { id: true, email: true, phone: true },
  });
  for (const card of cards) {
    await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: {
        email: card.email ? "redacted@example.test" : null,
        phone: card.phone ? "+233000000000" : null,
        displayName: "Sanitized Holder",
      },
    });
  }

  const owner = await prisma.user.upsert({
    where: { email: "sanitized.paid@example.test" },
    update: {},
    create: {
      email: "sanitized.paid@example.test",
      name: "Sanitized Paid",
      passwordHash: "x",
      role: "ORGANIZER",
    },
  });

  const samples = [
    {
      slug: `paid-active-${now}`,
      status: "ACTIVE",
      lastActivatedAt: new Date(now - 20 * 86_400_000),
      expires: new Date(now + 40 * 86_400_000),
      token: `tok_active_${now}`,
    },
    {
      slug: `paid-grace-${now}`,
      status: "EXPIRED",
      lastActivatedAt: new Date(now - 40 * 86_400_000),
      expires: new Date(now - 1 * 86_400_000),
      token: `tok_grace_${now}`,
    },
    {
      slug: `paid-courtesy-${now}`,
      status: "EXPIRED",
      lastActivatedAt: new Date(now - 60 * 86_400_000),
      expires: new Date(now - 10 * 86_400_000),
      token: `tok_cour_${now}`,
    },
    {
      slug: `ambig-inactive-${now}`,
      status: "INACTIVE",
      lastActivatedAt: null as Date | null,
      expires: null as Date | null,
      token: `tok_amb_${now}`,
    },
  ];

  for (const sample of samples) {
    await prisma.digitalBusinessCard.create({
      data: {
        userId: owner.id,
        slug: sample.slug,
        displayName: "Sanitized Holder",
        email: "redacted@example.test",
        phone: "+233000000000",
        isPublished: true,
        publicToken: sample.token,
        subscriptionStatus: sample.status,
        lastActivatedAt: sample.lastActivatedAt,
        subscriptionExpiresAt: sample.expires,
        themeId: "elegant-frost",
      },
    });
  }

  try {
    await prisma.payment.create({
      data: {
        userId: owner.id,
        amount: 49,
        currency: "GHS",
        status: "SUCCESSFUL",
        provider: "PAYSTACK",
        purpose: "ADVERTISING",
        reference: `sanitized_ref_${now}`,
        metadata: { product: "celeyou_pro_monthly", sanitized: true },
      },
    });
  } catch {
    // Payment model fields may differ; audit still classifies cards without this row.
  }

  console.log(
    JSON.stringify({
      seeded: samples.length,
      ownerId: owner.id,
      note: "Synthetic sanitized fixture. Not a production export.",
    })
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
