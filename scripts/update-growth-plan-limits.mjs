import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.eventPackage.updateMany({
    where: { slug: "growth" },
    data: {
      guestLimit: 100,
      invitationLimit: 100,
      price: 299,
    },
  });
  const row = await prisma.eventPackage.findUnique({ where: { slug: "growth" } });
  console.log(
    JSON.stringify(
      {
        updated: updated.count,
        guestLimit: row?.guestLimit,
        invitationLimit: row?.invitationLimit,
        price: row?.price,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
