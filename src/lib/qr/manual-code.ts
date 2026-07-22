import { prisma } from "@/lib/prisma";
import { isManualAdmissionCode } from "@/lib/qr/manual-code-pattern";

export { isManualAdmissionCode } from "@/lib/qr/manual-code-pattern";

/** Allocate a unique 4-digit code for an event (0000–9999). */
export async function allocateManualAdmissionCode(eventId: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const taken = await prisma.guest.findFirst({
      where: { eventId, manualCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }

  // Sequential fallback if random collisions spike (large events)
  for (let n = 0; n < 10000; n++) {
    const code = String(n).padStart(4, "0");
    const taken = await prisma.guest.findFirst({
      where: { eventId, manualCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }

  throw new Error("No available 4-digit admission codes for this event");
}

/** Ensure a guest has a manual code (backfill for legacy guests). */
export async function ensureGuestManualCode(guestId: string): Promise<string> {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) throw new Error("Guest not found");
  if (guest.manualCode && isManualAdmissionCode(guest.manualCode)) return guest.manualCode;

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = await allocateManualAdmissionCode(guest.eventId);
    try {
      await prisma.guest.update({
        where: { id: guestId },
        data: { manualCode: code },
      });
      return code;
    } catch {
      // unique race — retry
    }
  }
  throw new Error("Could not assign manual admission code");
}
