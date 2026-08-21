import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const updated = await prisma.eventPackage.updateMany({
  where: { slug: "premium" },
  data: { guestLimit: 300, invitationLimit: 300 },
});
const row = await prisma.eventPackage.findUnique({ where: { slug: "premium" } });
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
await prisma.$disconnect();
