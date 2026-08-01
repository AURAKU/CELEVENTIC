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
  it("maps RECEPTION to Reception across organiser surfaces", () => {
    assert.equal(seatingPlanDisplayName("RECEPTION"), "Reception");
    assert.equal(seatingPlanShortLabel("RECEPTION"), "Reception");
    assert.equal(seatingStageEyebrow("RECEPTION"), "Reception");
    assert.equal(seatingCapacityLabel("RECEPTION"), "Reception capacity");
  });

  it("maps CEREMONY to Main Ceremony across organiser surfaces", () => {
    assert.equal(seatingPlanDisplayName("CEREMONY"), "Main Ceremony");
    assert.equal(seatingPlanShortLabel("CEREMONY"), "Main Ceremony");
    assert.equal(seatingStageEyebrow("CEREMONY"), "Ceremony");
    assert.equal(seatingCapacityLabel("CEREMONY"), "Ceremony chairs");
  });

  it("defaults unknown plan types to Reception naming", () => {
    assert.equal(seatingPlanDisplayName(undefined), "Reception");
    assert.equal(seatingPlanDisplayName(null), "Reception");
    assert.equal(seatingPlanDisplayName("OTHER"), "Reception");
  });

  it("provides default draft plan names", () => {
    assert.equal(seatingPlanDefaultName("RECEPTION"), "Reception");
    assert.equal(seatingPlanDefaultName("CEREMONY"), "Main ceremony");
    assert.equal(seatingPlanDefaultName(), "Reception");
  });
});
