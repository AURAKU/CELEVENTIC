/**
 * Load sibling invitation labels for the same event — used to scrub foreign
 * party names from public payloads without exposing the full guest list.
 */

import { prisma } from "@/lib/prisma";

export async function loadSiblingInvitationLabels(
  eventId: string,
  invitationId: string
): Promise<Array<{ id: string; name: string }>> {
  const rows = await prisma.invitation.findMany({
    where: {
      eventId,
      archivedAt: null,
      id: { not: invitationId },
      status: { not: "EXPIRED" },
    },
    select: { id: true, name: true },
    take: 5_000,
  });
  return rows.filter((row) => row.name.trim().length >= 2);
}
