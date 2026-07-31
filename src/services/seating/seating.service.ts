import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { tablesMatch } from "@/lib/seating/seating-types";

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
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                qrToken: true,
                status: true,
              },
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
      data: {
        eventId,
        name,
        layout: layout as unknown as Prisma.InputJsonValue,
      },
      include: { assignments: true },
    });
  }

  /**
   * Make persisted assignments exactly match the organizer's current plan.
   * This prevents removed/renamed tables from leaving invisible stale rows.
   */
  async replaceAssignments(
    seatingPlanId: string,
    eventId: string,
    assignments: SeatingAssignmentInput[]
  ) {
    const guestIds = assignments.map((assignment) => assignment.guestId);
    if (new Set(guestIds).size !== guestIds.length) {
      throw new Error("A guest cannot be assigned more than once");
    }

    const occupiedSeats = new Set<string>();
    for (const assignment of assignments) {
      const seatKey = `${assignment.tableNumber.trim().toLowerCase()}:${assignment.seatLabel?.trim() ?? ""}`;
      if (assignment.seatLabel && occupiedSeats.has(seatKey)) {
        throw new Error(
          `Seat ${assignment.seatLabel} at ${assignment.tableNumber} is assigned twice`
        );
      }
      if (assignment.seatLabel) occupiedSeats.add(seatKey);
    }

    const validGuestCount = guestIds.length
      ? await prisma.guest.count({
          where: { id: { in: guestIds }, eventId, archivedAt: null },
        })
      : 0;
    if (validGuestCount !== guestIds.length) {
      throw new Error("One or more guests do not belong to this event");
    }

    return prisma.$transaction(async (tx) => {
      await tx.seatingAssignment.deleteMany({
        where: {
          OR: [
            { seatingPlanId },
            ...(guestIds.length > 0 ? [{ guestId: { in: guestIds } }] : []),
          ],
        },
      });
      if (assignments.length === 0) return [];
      await tx.seatingAssignment.createMany({
        data: assignments.map((assignment) => ({
          seatingPlanId,
          guestId: assignment.guestId,
          tableNumber: assignment.tableNumber.trim(),
          seatLabel: assignment.seatLabel?.trim() || null,
          zone: assignment.zone?.trim() || null,
          notes: assignment.notes?.trim() || null,
        })),
      });
      return tx.seatingAssignment.findMany({
        where: { seatingPlanId },
        orderBy: [{ tableNumber: "asc" }, { seatLabel: "asc" }],
      });
    });
  }

  async removeAssignment(guestId: string) {
    await prisma.seatingAssignment.deleteMany({ where: { guestId } });
  }

  async lookupByGuestToken(qrToken: string) {
    const guest = await prisma.guest.findUnique({
      where: { qrToken },
      include: {
        event: {
          select: { id: true, title: true, startDate: true, venueName: true },
        },
        seatingAssignment: {
          include: { seatingPlan: true },
        },
      },
    });
    if (!guest) return null;

    const assignment = guest.seatingAssignment;
    const layout = assignment?.seatingPlan?.layout as {
      tables?: Array<{
        label: string;
        shape?: string;
        seatCount?: number;
        zone?: string;
      }>;
    } | null;
    const tableConfig = layout?.tables?.find((t) =>
      tablesMatch(t.label, assignment?.tableNumber ?? "")
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
