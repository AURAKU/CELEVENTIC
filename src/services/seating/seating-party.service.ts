import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import {
  buildCompanionHoldDrafts,
  companionDisplayLabel,
  computePartySeatingRequirement,
  freePlacesOnTable,
  occupiedSeatKeys,
  type SeatingCompanionHoldView,
} from "@/lib/seating/party-capacity";
import { normalizeStudioLayout, partyGuestIds } from "@/lib/seating/studio-engine";
import type { StudioAssignment, StudioGuest, StudioTableConfig } from "@/lib/seating/studio-types";
import { tablesMatch } from "@/lib/seating/seating-types";

export type PartyAssignMode = "FULL_PARTY" | "SELECTED_ONLY";

export class SeatingPartyError extends Error {
  code: string;
  details?: Record<string, unknown>;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

function toHoldView(row: {
  id: string;
  invitationId: string;
  ownerGuestId: string | null;
  companionIndex: number;
  displayLabel: string;
  tableNumber: string;
  seatLabel: string | null;
  zone: string | null;
  notes: string | null;
  locked: boolean;
  status: string;
}): SeatingCompanionHoldView {
  return {
    id: row.id,
    invitationId: row.invitationId,
    ownerGuestId: row.ownerGuestId,
    companionIndex: row.companionIndex,
    displayLabel: row.displayLabel,
    tableNumber: row.tableNumber,
    seatLabel: row.seatLabel,
    zone: row.zone,
    notes: row.notes,
    locked: row.locked,
    status: row.status,
  };
}

export class SeatingPartyService {
  async listActiveHolds(seatingPlanId: string): Promise<SeatingCompanionHoldView[]> {
    const rows = await prisma.seatingCompanionHold.findMany({
      where: { seatingPlanId, status: "ACTIVE" },
      orderBy: [{ tableNumber: "asc" }, { companionIndex: "asc" }],
    });
    return rows.map(toHoldView);
  }

  async listPartyPlans(seatingPlanId: string) {
    return prisma.seatingPartyPlan.findMany({ where: { seatingPlanId } });
  }

  async upsertPartyPlan(input: {
    eventId: string;
    seatingPlanId: string;
    invitationId: string;
    requiredPlaces: number;
    assignmentStrategy?: string;
    splitConfirmed?: boolean;
    splitReason?: string | null;
    locked?: boolean;
    actorId?: string;
  }) {
    return prisma.seatingPartyPlan.upsert({
      where: {
        seatingPlanId_invitationId: {
          seatingPlanId: input.seatingPlanId,
          invitationId: input.invitationId,
        },
      },
      create: {
        eventId: input.eventId,
        seatingPlanId: input.seatingPlanId,
        invitationId: input.invitationId,
        requiredPlaces: input.requiredPlaces,
        assignmentStrategy: input.assignmentStrategy ?? "KEEP_TOGETHER",
        splitConfirmed: Boolean(input.splitConfirmed),
        splitReason: input.splitReason ?? null,
        locked: Boolean(input.locked),
        createdById: input.actorId,
        updatedById: input.actorId,
        lastCalculatedAt: new Date(),
      },
      update: {
        requiredPlaces: input.requiredPlaces,
        ...(input.assignmentStrategy ? { assignmentStrategy: input.assignmentStrategy } : {}),
        ...(input.splitConfirmed !== undefined ? { splitConfirmed: input.splitConfirmed } : {}),
        ...(input.splitReason !== undefined ? { splitReason: input.splitReason } : {}),
        ...(input.locked !== undefined ? { locked: input.locked } : {}),
        updatedById: input.actorId,
        lastCalculatedAt: new Date(),
      },
    });
  }

  /**
   * Assign a full party (named guests + companion holds) to one table in a transaction.
   */
  async assignPartyToTable(input: {
    eventId: string;
    seatingPlanId: string;
    guestId: string;
    tableNumber: string;
    zone?: string;
    mode: PartyAssignMode;
    tableOnly?: boolean;
    seatLabels?: string[];
    actorId?: string;
    guests: StudioGuest[];
    tables: StudioTableConfig[];
    confirmPartial?: boolean;
  }) {
    const table = input.tables.find((row) => tablesMatch(row.label, input.tableNumber));
    if (!table) {
      throw new SeatingPartyError("INVALID_TABLE", `Table "${input.tableNumber}" was not found.`);
    }

    const existingAssignments = await prisma.seatingAssignment.findMany({
      where: { seatingPlanId: input.seatingPlanId },
    });
    const existingHolds = await this.listActiveHolds(input.seatingPlanId);
    const requirement = computePartySeatingRequirement({
      guests: input.guests,
      guestId: input.guestId,
      assignments: existingAssignments.map((row) => ({
        guestId: row.guestId,
        tableNumber: row.tableNumber,
        seatLabel: row.seatLabel ?? undefined,
        zone: row.zone ?? undefined,
        notes: row.notes ?? undefined,
      })),
      holds: existingHolds,
    });

    const party = partyGuestIds(input.guests, input.guestId);
    const namedIds =
      input.mode === "SELECTED_ONLY" ? [input.guestId] : requirement.namedGuestIds;
    const unnamedNeeded =
      input.mode === "SELECTED_ONLY" ? 0 : requirement.unnamedCompanions;
    const placesNeeded = namedIds.length + unnamedNeeded;

    // Free capacity excluding this party's current occupancy on the target table.
    const partyAssignmentIds = new Set(namedIds);
    const otherAssignments = existingAssignments.filter(
      (row) => !partyAssignmentIds.has(row.guestId)
    );
    const otherHolds = existingHolds.filter(
      (hold) => !(requirement.invitationId && hold.invitationId === requirement.invitationId)
    );
    const available = freePlacesOnTable({
      table,
      assignments: otherAssignments.map((row) => ({
        guestId: row.guestId,
        tableNumber: row.tableNumber,
        seatLabel: row.seatLabel ?? undefined,
      })),
      holds: otherHolds,
    });

    if (placesNeeded > available && !input.confirmPartial) {
      throw new SeatingPartyError(
        "PARTY_DOES_NOT_FIT",
        `This party requires ${placesNeeded} places, but ${table.label} has only ${available} available.`,
        {
          requiredPlaces: placesNeeded,
          availablePlaces: available,
          tableId: table.id,
          tableLabel: table.label,
        }
      );
    }

    const placeCount = Math.min(placesNeeded, available);
    const namedToAssign = namedIds.slice(0, placeCount);
    const holdsToCreate = Math.max(0, placeCount - namedToAssign.length);

    if (!requirement.invitationId && holdsToCreate > 0) {
      throw new SeatingPartyError(
        "PARTY_INCOMPLETE",
        "Companion places require an invitation-linked party."
      );
    }

    let seatLabels = input.seatLabels ?? [];
    if (!input.tableOnly) {
      const occupied = occupiedSeatKeys({
        assignments: otherAssignments.map((row) => ({
          guestId: row.guestId,
          tableNumber: row.tableNumber,
          seatLabel: row.seatLabel ?? undefined,
        })),
        holds: otherHolds,
      });
      const capacity = table.seatCount ?? table.capacity ?? 8;
      if (!seatLabels.length) {
        seatLabels = [];
        for (let seat = 1; seat <= capacity && seatLabels.length < placeCount; seat += 1) {
          const key = `${table.label.trim().toLowerCase()}::${String(seat)}`;
          if (!occupied.has(key)) seatLabels.push(String(seat));
        }
      }
      if (seatLabels.length < placeCount) {
        throw new SeatingPartyError(
          "PARTY_DOES_NOT_FIT",
          `Not enough free chairs on ${table.label} for this party.`,
          { requiredPlaces: placeCount, availableSeats: seatLabels.length }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Clear prior party placements on this plan.
      if (requirement.invitationId) {
        await tx.seatingCompanionHold.updateMany({
          where: {
            seatingPlanId: input.seatingPlanId,
            invitationId: requirement.invitationId,
            status: "ACTIVE",
          },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
      }
      if (namedIds.length) {
        await tx.seatingAssignment.deleteMany({
          where: {
            seatingPlanId: input.seatingPlanId,
            guestId: { in: namedIds },
          },
        });
      }

      const createdAssignments = [];
      for (let index = 0; index < namedToAssign.length; index += 1) {
        const guestId = namedToAssign[index]!;
        const row = await tx.seatingAssignment.create({
          data: {
            seatingPlanId: input.seatingPlanId,
            guestId,
            tableNumber: table.label,
            seatLabel: input.tableOnly ? null : seatLabels[index] ?? null,
            zone: input.zone ?? table.zone ?? null,
            notes:
              input.tableOnly && input.mode === "FULL_PARTY"
                ? `TABLE_ONLY:${requirement.requiredPlaces}`
                : null,
          },
        });
        createdAssignments.push(row);
      }

      const holdDrafts =
        requirement.invitationId && holdsToCreate > 0
          ? buildCompanionHoldDrafts({
              ownerName: requirement.ownerName,
              invitationId: requirement.invitationId,
              ownerGuestId: requirement.ownerGuestId,
              unnamedCount: holdsToCreate,
              tableNumber: table.label,
              zone: input.zone ?? table.zone,
              seatLabels: input.tableOnly
                ? undefined
                : seatLabels.slice(namedToAssign.length, namedToAssign.length + holdsToCreate),
            })
          : [];

      const createdHolds = [];
      for (const draft of holdDrafts) {
        const hold = await tx.seatingCompanionHold.create({
          data: {
            eventId: input.eventId,
            seatingPlanId: input.seatingPlanId,
            invitationId: draft.invitationId,
            ownerGuestId: draft.ownerGuestId,
            companionIndex: draft.companionIndex,
            displayLabel: draft.displayLabel,
            tableNumber: draft.tableNumber,
            seatLabel: draft.seatLabel ?? null,
            zone: draft.zone ?? null,
            status: "ACTIVE",
            createdById: input.actorId,
          },
        });
        createdHolds.push(hold);
      }

      if (requirement.invitationId) {
        await tx.seatingPartyPlan.upsert({
          where: {
            seatingPlanId_invitationId: {
              seatingPlanId: input.seatingPlanId,
              invitationId: requirement.invitationId,
            },
          },
          create: {
            eventId: input.eventId,
            seatingPlanId: input.seatingPlanId,
            invitationId: requirement.invitationId,
            requiredPlaces: requirement.requiredPlaces,
            assignmentStrategy:
              placeCount < requirement.requiredPlaces ? "INDIVIDUAL_ASSIGNMENT" : "KEEP_TOGETHER",
            splitConfirmed: false,
            createdById: input.actorId,
            updatedById: input.actorId,
            lastCalculatedAt: new Date(),
          },
          update: {
            requiredPlaces: requirement.requiredPlaces,
            assignmentStrategy:
              placeCount < requirement.requiredPlaces ? "INDIVIDUAL_ASSIGNMENT" : "KEEP_TOGETHER",
            splitConfirmed: false,
            updatedById: input.actorId,
            lastCalculatedAt: new Date(),
          },
        });
      }

      return { assignments: createdAssignments, holds: createdHolds, placeCount, available };
    });

    if (input.actorId) {
      await createAuditLog({
        userId: input.actorId,
        action: "UPDATE",
        entity: "SeatingPartyAssignment",
        entityId: input.seatingPlanId,
        details: {
          eventId: input.eventId,
          tableNumber: table.label,
          mode: input.mode,
          named: namedToAssign.length,
          companions: result.holds.length,
          requiredPlaces: requirement.requiredPlaces,
        },
      }).catch(() => undefined);
    }

    return {
      ...result,
      requirement,
      tableLabel: table.label,
      partial: placeCount < placesNeeded,
    };
  }

  async moveParty(input: {
    eventId: string;
    seatingPlanId: string;
    invitationId: string;
    toTableNumber: string;
    zone?: string;
    actorId?: string;
  }) {
    const plan = await prisma.seatingPlan.findFirst({
      where: { id: input.seatingPlanId, eventId: input.eventId },
    });
    if (!plan) throw new SeatingPartyError("INVALID_TABLE", "Seating plan not found");
    const layout = normalizeStudioLayout(plan.layout as object);
    const table = layout.tables.find((row) => tablesMatch(row.label, input.toTableNumber));
    if (!table) throw new SeatingPartyError("INVALID_TABLE", `Table "${input.toTableNumber}" not found`);

    return prisma.$transaction(async (tx) => {
      const guests = await tx.guest.findMany({
        where: { eventId: input.eventId, invitationId: input.invitationId, archivedAt: null },
        select: { id: true },
      });
      const guestIds = guests.map((guest) => guest.id);
      await tx.seatingAssignment.updateMany({
        where: { seatingPlanId: input.seatingPlanId, guestId: { in: guestIds } },
        data: {
          tableNumber: table.label,
          zone: input.zone ?? table.zone ?? null,
        },
      });
      await tx.seatingCompanionHold.updateMany({
        where: {
          seatingPlanId: input.seatingPlanId,
          invitationId: input.invitationId,
          status: "ACTIVE",
        },
        data: {
          tableNumber: table.label,
          zone: input.zone ?? table.zone ?? null,
        },
      });
      return { movedGuests: guestIds.length, tableLabel: table.label };
    });
  }

  async confirmSplit(input: {
    eventId: string;
    seatingPlanId: string;
    invitationId: string;
    requiredPlaces: number;
    reason?: string | null;
    actorId?: string;
  }) {
    return this.upsertPartyPlan({
      ...input,
      assignmentStrategy: "SPLIT_CONFIRMED",
      splitConfirmed: true,
      splitReason: input.reason ?? null,
    });
  }

  async convertCompanionHold(input: {
    eventId: string;
    holdId: string;
    guestId: string;
    actorId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const hold = await tx.seatingCompanionHold.findFirst({
        where: { id: input.holdId, eventId: input.eventId, status: "ACTIVE" },
      });
      if (!hold) throw new SeatingPartyError("COMPANION_HOLD_CONFLICT", "Companion hold not found");

      const guest = await tx.guest.findFirst({
        where: { id: input.guestId, eventId: input.eventId },
      });
      if (!guest) throw new SeatingPartyError("CROSS_EVENT_GUEST", "Guest not found for this event");

      const existing = await tx.seatingAssignment.findUnique({
        where: {
          guestId_seatingPlanId: {
            guestId: input.guestId,
            seatingPlanId: hold.seatingPlanId,
          },
        },
      });
      if (existing) {
        throw new SeatingPartyError(
          "COMPANION_HOLD_CONFLICT",
          "This guest already has a seat on this plan."
        );
      }

      if (hold.seatLabel) {
        const clash = await tx.seatingAssignment.findFirst({
          where: {
            seatingPlanId: hold.seatingPlanId,
            tableNumber: hold.tableNumber,
            seatLabel: hold.seatLabel,
          },
        });
        if (clash) {
          throw new SeatingPartyError("DUPLICATE_SEAT", "That seat is already assigned.");
        }
      }

      const assignment = await tx.seatingAssignment.create({
        data: {
          seatingPlanId: hold.seatingPlanId,
          guestId: input.guestId,
          tableNumber: hold.tableNumber,
          seatLabel: hold.seatLabel,
          zone: hold.zone,
          notes: hold.notes,
          locked: hold.locked,
        },
      });

      await tx.seatingCompanionHold.update({
        where: { id: hold.id },
        data: {
          status: "CONVERTED",
          convertedGuestId: input.guestId,
          releasedAt: new Date(),
        },
      });

      return { assignment, holdId: hold.id, displayLabel: hold.displayLabel };
    });
  }

  async releaseHoldsForInvitation(input: {
    seatingPlanId: string;
    invitationId: string;
    actorId?: string;
  }) {
    return prisma.seatingCompanionHold.updateMany({
      where: {
        seatingPlanId: input.seatingPlanId,
        invitationId: input.invitationId,
        status: "ACTIVE",
      },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
  }

  async releaseHoldById(input: { eventId: string; holdId: string; actorId?: string }) {
    const hold = await prisma.seatingCompanionHold.findFirst({
      where: { id: input.holdId, eventId: input.eventId, status: "ACTIVE" },
    });
    if (!hold) {
      throw new SeatingPartyError("COMPANION_HOLD_CONFLICT", "Companion hold not found");
    }
    return prisma.seatingCompanionHold.update({
      where: { id: hold.id },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
  }
}

export const seatingPartyService = new SeatingPartyService();

export { companionDisplayLabel };
