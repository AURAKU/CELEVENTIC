import { PrismaClient } from "@prisma/client";
import { passTokenFromNonce } from "../src/lib/admission/pass-token";

const prisma = new PrismaClient();

async function main() {
  const pass = await prisma.guestPass.findFirst({
    where: { status: { in: ["ACTIVE", "PARTIALLY_ADMITTED", "ADMITTED"] } },
    include: {
      invitation: { include: { guests: { take: 1, orderBy: { createdAt: "asc" } } } },
      event: { select: { title: true, id: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  if (!pass) {
    console.log(JSON.stringify({ error: "NO_PASS" }));
    return;
  }

  await prisma.invitation.update({
    where: { id: pass.invitationId },
    data: {
      postAdmissionEnabled: true,
      admissionState: "ADMITTED",
      admittedCount: Math.max(1, pass.partySize),
      status: "ACTIVE",
    },
  });

  await prisma.guestPass.update({
    where: { id: pass.id },
    data: {
      admittedCount: Math.max(1, pass.partySize),
      status: "ADMITTED",
      firstAdmittedAt: pass.firstAdmittedAt ?? new Date(),
      lastAdmittedAt: new Date(),
    },
  });

  if (pass.invitation.guests[0]) {
    await prisma.guest.update({
      where: { id: pass.invitation.guests[0].id },
      data: { status: "CHECKED_IN" },
    });
  }

  await prisma.event.update({
    where: { id: pass.eventId },
    data: { startDate: new Date() },
  });

  const token = passTokenFromNonce(pass.tokenNonce);
  const guest = pass.invitation.guests[0]?.qrToken ?? "";
  const link = pass.invitation.uniqueLink;

  console.log(
    JSON.stringify(
      {
        event: pass.event.title,
        uniqueLink: link,
        guestToken: guest,
        inviteUrl: `http://127.0.0.1:3000/invite/${link}${guest ? `?guest=${guest}` : ""}`,
        admissionUrl: `http://127.0.0.1:3000/admission/${encodeURIComponent(token)}`,
        companionUrl: `http://127.0.0.1:3000/invite/${link}/event-day${guest ? `?guest=${guest}` : ""}`,
      },
      null,
      2
    )
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
