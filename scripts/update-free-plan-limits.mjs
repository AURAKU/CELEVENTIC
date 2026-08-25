import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.eventPackage.updateMany({
    where: { slug: "starter" },
    data: {
      name: "Free",
      description: "Try Celeventic with up to 5 guests and 5 invitations — upgrade anytime",
      guestLimit: 5,
      invitationLimit: 5,
      ticketLimit: 5,
      smsCredits: 0,
      emailCredits: 10,
      whatsappCredits: 0,
      price: 0,
    },
  });
  const row = await prisma.eventPackage.findUnique({ where: { slug: "starter" } });
  console.log(JSON.stringify({ updated: updated.count, row }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
