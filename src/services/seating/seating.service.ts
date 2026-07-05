import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface SeatingTable {
  id: string;
  label: string;
  zone?: string;
  capacity?: number;
}

export interface SeatingLayout {
  tables: SeatingTable[];
  notes?: string;
}

export interface SeatingAssignmentInput {
  guestId: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
  notes?: string;
}

export class SeatingService {
  async getPlanForEvent(eventId: string) {
    return prisma.seatingPlan.findFirst({
      where: { eventId },
      include: {
        assignments: {
          include: {
            guest: {
              select: { id: true, name: true, email: true, phone: true, qrToken: true, status: true },
            },
          },
          orderBy: { tableNumber: "asc" },
        },
      },
    });
  }

  async upsertPlan(eventId: string, name: string, layout: SeatingLayout) {
    const existing = await prisma.seatingPlan.findFirst({ where: { eventId } });
    if (existing) {
      return prisma.seatingPlan.update({
        where: { id: existing.id },
        data: { name, layout: layout as unknown as Prisma.InputJsonValue },
        include: { assignments: true },
      });
    }
    return prisma.seatingPlan.create({
      data: { eventId, name, layout: layout as unknown as Prisma.InputJsonValue },
      include: { assignments: true },
    });
  }

  async bulkAssign(seatingPlanId: string, assignments: SeatingAssignmentInput[]) {
    const results = [];
    for (const a of assignments) {
      const row = await prisma.seatingAssignment.upsert({
        where: { guestId: a.guestId },
        create: {
          seatingPlanId,
          guestId: a.guestId,
          tableNumber: a.tableNumber,
          seatLabel: a.seatLabel,
          zone: a.zone,
          notes: a.notes,
        },
        update: {
          tableNumber: a.tableNumber,
          seatLabel: a.seatLabel,
          zone: a.zone,
          notes: a.notes,
        },
      });
      results.push(row);
    }
    return results;
  }

  async removeAssignment(guestId: string) {
    await prisma.seatingAssignment.deleteMany({ where: { guestId } });
  }

  async lookupByGuestToken(qrToken: string) {
    const guest = await prisma.guest.findUnique({
      where: { qrToken },
      include: {
        event: { select: { id: true, title: true, startDate: true, venueName: true } },
        seatingAssignment: {
          include: { seatingPlan: true },
        },
      },
    });
    if (!guest) return null;

    const assignment = guest.seatingAssignment;
    const layout = assignment?.seatingPlan?.layout as { tables?: Array<{ label: string; shape?: string; seatCount?: number; zone?: string }> } | null;
    const tableConfig = layout?.tables?.find(
      (t) => t.label.trim().toLowerCase() === assignment?.tableNumber.trim().toLowerCase()
    );

    if (!assignment) {
      return {
        guest: { id: guest.id, name: guest.name, status: guest.status },
        event: guest.event,
        assignment: null,
        table: null,
      };
    }

    return {
      guest: { id: guest.id, name: guest.name, status: guest.status },
      event: guest.event,
      assignment: {
        tableNumber: assignment.tableNumber,
        seatLabel: assignment.seatLabel,
        zone: assignment.zone,
        notes: assignment.notes,
        planName: assignment.seatingPlan.name,
        admitted: guest.status === "CHECKED_IN",
      },
      table: tableConfig
        ? {
            label: tableConfig.label,
            shape: tableConfig.shape ?? "round",
            seatCount: tableConfig.seatCount ?? 8,
            zone: tableConfig.zone,
          }
        : null,
      layout: layout ?? null,
    };
  }

  async lookupByGuestId(guestId: string) {
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { qrToken: true },
    });
    if (!guest) return null;
    return this.lookupByGuestToken(guest.qrToken);
  }

  async searchGuests(eventId: string, query: string) {
    return prisma.guest.findMany({
      where: {
        eventId,
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      take: 20,
      include: { seatingAssignment: true },
      orderBy: { name: "asc" },
    });
  }
}

export const seatingService = new SeatingService();
