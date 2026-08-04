import { prisma } from "@/lib/prisma";
import type { Prisma, SeatingPlanType } from "@prisma/client";
import { tablesMatch } from "@/lib/seating/seating-types";
import { normalizeStudioLayout } from "@/lib/seating/studio-engine";
import { splitSeatingAssignments } from "@/lib/seating/assignment-pick";
import { filterForeignPartyGuests } from "@/lib/invitation/party-isolation";
import { loadSiblingInvitationLabels } from "@/lib/invitation/sibling-invitations";

export interface SeatingTable {
  id: string;
  label: string;
  zone?: string;
  capacity?: number;
}

export interface SeatingLayout {
  tables: SeatingTable[];
  notes?: string;
  [key: string]: unknown;
}

export interface SeatingAssignmentInput {
  guestId: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
  notes?: string;
}

const planInclude = {
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
    orderBy: { tableNumber: "asc" as const },
  },
} as const;

export class SeatingService {
  async getPlansForEvent(eventId: string) {
    return prisma.seatingPlan.findMany({
      where: { eventId },
      include: planInclude,
      orderBy: { planType: "asc" },
    });
  }

  /** Backward-compatible: reception plan first, else any plan. */
  async getPlanForEvent(eventId: string) {
    const plans = await this.getPlansForEvent(eventId);
    return plans.find((plan) => plan.planType === "RECEPTION") ?? plans[0] ?? null;
  }

  async getPlanByType(eventId: string, planType: SeatingPlanType) {
    return prisma.seatingPlan.findUnique({
      where: { eventId_planType: { eventId, planType } },
      include: planInclude,
    });
  }

  async upsertPlan(
    eventId: string,
    name: string,
    layout: SeatingLayout,
    planType: SeatingPlanType = "RECEPTION"
  ) {
    const normalized = normalizeStudioLayout({
      ...layout,
      planKind: planType,
    });
    const existing = await prisma.seatingPlan.findUnique({
      where: { eventId_planType: { eventId, planType } },
    });
    if (existing) {
      return prisma.seatingPlan.update({
        where: { id: existing.id },
        data: {
          name,
          layout: normalized as unknown as Prisma.InputJsonValue,
        },
        include: { assignments: true },
      });
    }
    return prisma.seatingPlan.create({
      data: {
        eventId,
        name,
        planType,
        layout: normalized as unknown as Prisma.InputJsonValue,
      },
      include: { assignments: true },
    });
  }

  /**
   * Make persisted assignments exactly match the organizer's current plan.
   * Scoped to this seatingPlanId only — never deletes the other plan's seats.
   */
  async replaceAssignments(
    seatingPlanId: string,
    eventId: string,
    assignments: SeatingAssignmentInput[]
  ) {
    const guestIds = assignments.map((assignment) => assignment.guestId);
    if (new Set(guestIds).size !== guestIds.length) {
      throw new Error("A guest cannot be assigned more than once on the same plan");
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
      await tx.seatingAssignment.deleteMany({ where: { seatingPlanId } });
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

  /** Auto-save a single guest (or replace one guest's seats on this plan). */
  async upsertGuestAssignment(
    seatingPlanId: string,
    eventId: string,
    assignment: SeatingAssignmentInput
  ) {
    const guest = await prisma.guest.findFirst({
      where: { id: assignment.guestId, eventId, archivedAt: null },
      select: { id: true },
    });
    if (!guest) throw new Error("Guest not found on this event");

    if (assignment.seatLabel) {
      const clash = await prisma.seatingAssignment.findFirst({
        where: {
          seatingPlanId,
          tableNumber: assignment.tableNumber.trim(),
          seatLabel: assignment.seatLabel.trim(),
          NOT: { guestId: assignment.guestId },
        },
      });
      if (clash) {
        throw new Error(
          `Seat ${assignment.seatLabel} at ${assignment.tableNumber} is already assigned`
        );
      }
    }

    return prisma.seatingAssignment.upsert({
      where: {
        guestId_seatingPlanId: {
          guestId: assignment.guestId,
          seatingPlanId,
        },
      },
      create: {
        seatingPlanId,
        guestId: assignment.guestId,
        tableNumber: assignment.tableNumber.trim(),
        seatLabel: assignment.seatLabel?.trim() || null,
        zone: assignment.zone?.trim() || null,
        notes: assignment.notes?.trim() || null,
      },
      update: {
        tableNumber: assignment.tableNumber.trim(),
        seatLabel: assignment.seatLabel?.trim() || null,
        zone: assignment.zone?.trim() || null,
        notes: assignment.notes?.trim() || null,
      },
    });
  }

  async removeAssignment(guestId: string, seatingPlanId?: string) {
    await prisma.seatingAssignment.deleteMany({
      where: seatingPlanId ? { guestId, seatingPlanId } : { guestId },
    });
  }

  async lookupByGuestToken(qrToken: string) {
    const guest = await prisma.guest.findUnique({
      where: { qrToken },
      include: {
        event: {
          select: { id: true, title: true, startDate: true, venueName: true },
        },
        seatingAssignments: {
          include: {
            seatingPlan: true,
          },
        },
        invitation: {
          select: {
            id: true,
            name: true,
            admissionAllowance: true,
            admittedCount: true,
            guests: {
              where: { archivedAt: null },
              select: {
                id: true,
                name: true,
                status: true,
                seatingAssignments: {
                  include: {
                    seatingPlan: { select: { planType: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!guest) return null;

    const { reception, ceremony } = splitSeatingAssignments(guest.seatingAssignments);
    const receptionLayout = (reception?.seatingPlan?.layout ?? null) as {
      tables?: Array<{ label: string; shape?: string; seatCount?: number; zone?: string }>;
      status?: "draft" | "published";
      settings?: Record<string, unknown>;
    } | null;
    const ceremonyLayout = (ceremony?.seatingPlan?.layout ?? null) as {
      ceremonyRows?: Array<{ label: string; chairs?: Array<{ label: string }> }>;
      ceremonySections?: Array<{ id: string; name: string }>;
      status?: "draft" | "published";
      settings?: Record<string, unknown>;
    } | null;

    const tableConfig = receptionLayout?.tables?.find((t) =>
      tablesMatch(t.label, reception?.tableNumber ?? "")
    );

    const siblings = guest.invitation
      ? await loadSiblingInvitationLabels(guest.eventId, guest.invitation.id)
      : [];
    const partyRoster = guest.invitation
      ? filterForeignPartyGuests(
          guest.invitation.guests.map((member) => ({
            ...member,
            invitationId: guest.invitation!.id,
          })),
          {
            invitationId: guest.invitation.id,
            invitationName: guest.invitation.name,
            otherInvitationNames: siblings,
          }
        )
      : [];

    const partyMembers = partyRoster.map((member) => {
      const split = splitSeatingAssignments(member.seatingAssignments);
      return {
        id: member.id,
        name: member.name,
        seatLabel: split.reception?.seatLabel ?? null,
        ceremonySeatLabel: split.ceremony?.seatLabel ?? null,
        admitted: member.status === "CHECKED_IN",
      };
    });

    const receptionPublished =
      !reception || receptionLayout?.status !== "draft";
    const ceremonyPublished =
      !ceremony || ceremonyLayout?.status !== "draft";

    return {
      guest: { id: guest.id, name: guest.name, status: guest.status },
      event: guest.event,
      planStatus: receptionPublished ? "published" : "draft",
      settings: {
        ...(ceremonyLayout?.settings ?? {}),
        ...(receptionLayout?.settings ?? {}),
      },
      party: guest.invitation
        ? {
            name: guest.invitation.name,
            allowance: Math.max(
              guest.invitation.admissionAllowance ?? 1,
              partyMembers.length || 1
            ),
            admittedCount: guest.invitation.admittedCount ?? 0,
            members: partyMembers,
          }
        : undefined,
      assignment:
        reception && receptionPublished
          ? {
              tableNumber: reception.tableNumber,
              seatLabel: reception.seatLabel,
              zone: reception.zone,
              notes: reception.notes,
              planName: reception.seatingPlan.name,
              planType: "RECEPTION" as const,
              admitted: guest.status === "CHECKED_IN",
            }
          : null,
      ceremonyAssignment:
        ceremony && ceremonyPublished
          ? {
              rowLabel: ceremony.tableNumber,
              seatLabel: ceremony.seatLabel,
              zone: ceremony.zone,
              notes: ceremony.notes,
              planName: ceremony.seatingPlan.name,
              planType: "CEREMONY" as const,
              admitted: guest.status === "CHECKED_IN",
            }
          : null,
      table: tableConfig
        ? {
            label: tableConfig.label,
            shape: tableConfig.shape ?? "round",
            seatCount: tableConfig.seatCount ?? 8,
            zone: tableConfig.zone,
          }
        : null,
      layout: receptionLayout ?? null,
      ceremonyLayout: ceremonyLayout ?? null,
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
      include: {
        seatingAssignments: {
          include: { seatingPlan: { select: { planType: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
  }
}

export const seatingService = new SeatingService();
