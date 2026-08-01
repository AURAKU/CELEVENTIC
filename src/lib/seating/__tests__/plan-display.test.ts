import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  seatingCapacityLabel,
  seatingPlanDefaultName,
  seatingPlanDisplayName,
  seatingPlanShortLabel,
  seatingStageEyebrow,
} from "../plan-display";

describe("seating plan display labels", () => {
  it("maps RECEPTION to Event Seating across organiser surfaces", () => {
    assert.equal(seatingPlanDisplayName("RECEPTION"), "Event Seating");
    assert.equal(seatingPlanShortLabel("RECEPTION"), "Event Seating");
    assert.equal(seatingStageEyebrow("RECEPTION"), "Event Seating");
    assert.equal(seatingCapacityLabel("RECEPTION"), "Event seating capacity");
  });

  it("maps CEREMONY to Main Ceremony across organiser surfaces", () => {
    assert.equal(seatingPlanDisplayName("CEREMONY"), "Main Ceremony");
    assert.equal(seatingPlanShortLabel("CEREMONY"), "Main Ceremony");
    assert.equal(seatingStageEyebrow("CEREMONY"), "Ceremony");
    assert.equal(seatingCapacityLabel("CEREMONY"), "Ceremony chairs");
  });

  it("defaults unknown plan types to Event Seating naming", () => {
    assert.equal(seatingPlanDisplayName(undefined), "Event Seating");
    assert.equal(seatingPlanDisplayName(null), "Event Seating");
    assert.equal(seatingPlanDisplayName("OTHER"), "Event Seating");
  });

  it("provides default draft plan names", () => {
    assert.equal(seatingPlanDefaultName("RECEPTION"), "Main Event Seating");
    assert.equal(seatingPlanDefaultName("CEREMONY"), "Main ceremony");
    assert.equal(seatingPlanDefaultName(), "Main Event Seating");
  });
});
