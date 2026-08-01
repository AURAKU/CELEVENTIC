import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companionDisplayLabel,
  computePartySeatingRequirement,
  tableOccupancyCount,
} from "../party-capacity";
import { detectSeatingConflicts } from "../studio-engine";
import type { StudioAssignment, StudioGuest, StudioTableConfig } from "../studio-types";

function guest(partial: Partial<StudioGuest> & Pick<StudioGuest, "id" | "name">): StudioGuest {
  return {
    email: null,
    phone: null,
    plusOnes: 0,
    invitationId: null,
    partySize: 1,
    admission: null,
    ...partial,
  };
}

function table(label: string, seats: number): StudioTableConfig {
  return {
    id: label,
    label,
    shape: "round",
    seatCount: seats,
    capacity: seats,
    x: 0,
    y: 0,
  };
}

describe("party capacity helpers", () => {
  it("counts one named guest plus three allowance companions as three unnamed companions", () => {
    const guests: StudioGuest[] = [
      guest({
        id: "g1",
        name: "Ama Mensah",
        invitationId: "inv-1",
        partySize: 4,
        admission: { allowance: 4, admittedCount: 0, remainingCount: 4, state: "ACTIVE" },
      }),
    ];

    const requirement = computePartySeatingRequirement({
      guests,
      guestId: "g1",
      assignments: [],
      holds: [],
    });

    assert.equal(requirement.namedCount, 1);
    assert.equal(requirement.requiredPlaces, 4);
    assert.equal(requirement.unnamedCompanions, 3);
    assert.equal(requirement.missingPlaces, 4);
  });

  it("includes active companion holds in table occupancy", () => {
    const assignments: StudioAssignment[] = [
      { guestId: "g1", tableNumber: "Table 1", seatLabel: "1" },
    ];
    const holds = [
      {
        id: "h1",
        invitationId: "inv-1",
        ownerGuestId: "g1",
        companionIndex: 1,
        displayLabel: "Ama's Guest 1",
        tableNumber: "Table 1",
        seatLabel: "2",
        locked: false,
        status: "ACTIVE" as const,
      },
      {
        id: "h2",
        invitationId: "inv-1",
        ownerGuestId: "g1",
        companionIndex: 2,
        displayLabel: "Ama's Guest 2",
        tableNumber: "Table 1",
        seatLabel: "3",
        locked: false,
        status: "RELEASED" as const,
      },
    ];

    assert.equal(
      tableOccupancyCount({
        tableLabel: "1",
        assignments,
        holds,
      }),
      2
    );
  });

  it("formats companion display labels with possessive owner names", () => {
    assert.equal(companionDisplayLabel("Ama Mensah", 1), "Ama's Guest 1");
    assert.equal(companionDisplayLabel("James", 2), "James' Guest 2");
    assert.equal(companionDisplayLabel("Chris", 1), "Chris' Guest 1");
  });
});

describe("companion holds in conflict detection", () => {
  it("counts companion holds toward table capacity", () => {
    const guests = [guest({ id: "g1", name: "Ama", invitationId: "inv1", partySize: 4, plusOnes: 3 })];
    const conflicts = detectSeatingConflicts({
      guests,
      tables: [table("Table 1", 2)],
      assignments: [{ guestId: "g1", tableNumber: "Table 1", seatLabel: "1" }],
      companionHolds: [
        { id: "h1", invitationId: "inv1", tableNumber: "Table 1", seatLabel: "2", status: "ACTIVE" },
        { id: "h2", invitationId: "inv1", tableNumber: "Table 1", seatLabel: "3", status: "ACTIVE" },
      ],
    });
    assert.ok(conflicts.some((c) => c.code === "TABLE_OVER_CAPACITY"));
  });

  it("suppresses split warning when splitConfirmed", () => {
    const guests = [
      guest({ id: "g1", name: "Ama", invitationId: "inv1", partySize: 2 }),
      guest({ id: "g2", name: "Kofi", invitationId: "inv1", partySize: 2 }),
    ];
    const tables = [table("Table 1", 8), table("Table 2", 8)];
    const assignments: StudioAssignment[] = [
      { guestId: "g1", tableNumber: "Table 1", seatLabel: "1" },
      { guestId: "g2", tableNumber: "Table 2", seatLabel: "1" },
    ];
    const without = detectSeatingConflicts({ guests, tables, assignments });
    assert.ok(without.some((c) => c.code === "PARTY_SPLIT_UNCONFIRMED"));
    const withConfirm = detectSeatingConflicts({
      guests,
      tables,
      assignments,
      confirmedSplitInvitationIds: new Set(["inv1"]),
    });
    assert.ok(!withConfirm.some((c) => c.code === "PARTY_SPLIT_UNCONFIRMED"));
  });
});
