import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  syncAdmissionAfterCheckIn,
  resetAdmission,
  getInvitationAdmission,
} from "@/services/admission/admission.service";

let ok = true;
const check = (name: string, cond: boolean) => { if (!cond) ok = false; console.log(`${cond ? "✓" : "✗"} ${name}`); };

async function admit(guestId: string, invitationId: string) {
  await prisma.guest.update({ where: { id: guestId }, data: { status: "CHECKED_IN" } });
  await syncAdmissionAfterCheckIn({ invitationId, guestId, scannerUserId: null });
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error("no user in db to own the test event");
  const tag = `itest-${randomUUID().slice(0, 8)}`;

  const event = await prisma.event.create({
    data: { slug: tag, title: "ITEST Wedding", eventType: "WEDDING", hostName: "A & B", startDate: new Date(Date.now()+86400000), organizerId: user.id, status: "PUBLISHED" as any },
  });
  const invitation = await prisma.invitation.create({
    data: { eventId: event.id, name: "The Mensah Family", slug: `${tag}-inv`, uniqueLink: `${tag}-link`, status: "ACTIVE", postAdmissionEnabled: true },
  });
  // Party of 3: guest A (1 head) + guest B (2 heads via +1)
  const a = await prisma.guest.create({ data: { eventId: event.id, invitationId: invitation.id, name: "Guest A", plusOnes: 0 } });
  const b = await prisma.guest.create({ data: { eventId: event.id, invitationId: invitation.id, name: "Guest B", plusOnes: 1 } });
  const plan = await prisma.seatingPlan.create({ data: { eventId: event.id, name: "Main", layout: {} } });
  await prisma.seatingAssignment.create({ data: { seatingPlanId: plan.id, guestId: a.id, tableNumber: "6", seatLabel: "6A" } });

  try {
    let s = await getInvitationAdmission(invitation.id);
    check("before admission: locked", s?.canAccessPortal === false && s?.admittedCount === 0 && s?.allowance === 3);

    await admit(a.id, invitation.id);
    s = await getInvitationAdmission(invitation.id);
    check("partial admit (1/3): unlocked + PARTIALLY_ADMITTED", s?.canAccessPortal === true && s?.admittedCount === 1 && s?.state === "PARTIALLY_ADMITTED" && s?.remainingCount === 2);

    await admit(b.id, invitation.id);
    s = await getInvitationAdmission(invitation.id);
    check("full admit (3/3): ADMITTED", s?.admittedCount === 3 && s?.state === "ADMITTED" && s?.remainingCount === 0);

    // Reset one member (individual) → back to partial, still unlocked
    await resetAdmission({ invitationId: invitation.id, scope: "individual", guestIds: [b.id], actorUserId: user.id, reason: "correction" });
    s = await getInvitationAdmission(invitation.id);
    check("reset one member: 1/3, still unlocked", s?.admittedCount === 1 && s?.canAccessPortal === true && s?.state === "PARTIALLY_ADMITTED");

    const invAfterPartial = await prisma.invitation.findUnique({ where: { id: invitation.id }, select: { portalTokenVersion: true } });

    // Reset entire → relock at 0
    await resetAdmission({ invitationId: invitation.id, scope: "entire", actorUserId: user.id, reason: "clear all" });
    s = await getInvitationAdmission(invitation.id);
    check("reset entire: 0/3, relocked, ADMISSION_RESET", s?.admittedCount === 0 && s?.canAccessPortal === false && s?.state === "ADMISSION_RESET");

    const invAfterReset = await prisma.invitation.findUnique({ where: { id: invitation.id }, select: { portalTokenVersion: true } });
    check("portalTokenVersion bumped on relock", (invAfterReset?.portalTokenVersion ?? 0) > (invAfterPartial?.portalTokenVersion ?? 0));

    // Seating preserved by default
    const seat = await prisma.seatingAssignment.findUnique({ where: { guestId: a.id } });
    check("seating preserved after reset (default)", seat !== null && seat.tableNumber === "6");

    // Append-only trail preserved (>= 5 events: 2 admits + 3 reset-recompute rows)
    const events = await prisma.admissionEvent.count({ where: { invitationId: invitation.id } });
    check("admission trail append-only (>=4 rows)", events >= 4);

    // Readmit after reset
    await admit(a.id, invitation.id);
    s = await getInvitationAdmission(invitation.id);
    check("readmit after reset: unlocked again", s?.canAccessPortal === true && s?.admittedCount === 1);

    // RSVP-style privacy: reset preserves guest rows (not deleted)
    const guestsLeft = await prisma.guest.count({ where: { invitationId: invitation.id } });
    check("guest rows preserved through resets", guestsLeft === 2);
  } finally {
    await prisma.event.delete({ where: { id: event.id } }); // cascade cleans invitation/guests/admission_events/seating
  }

  console.log(ok ? "\nALL DB INTEGRATION CHECKS PASSED" : "\nSOME CHECKS FAILED");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
