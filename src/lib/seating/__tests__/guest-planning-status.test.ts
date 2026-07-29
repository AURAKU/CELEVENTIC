import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareGuestsForSeatingAssign,
  seatingAssignPriority,
  seatingPlanningLabel,
  seatingPlanningTone,
} from "@/lib/seating/guest-planning-status";

describe("seating planning status", () => {
  it("prioritises accepted and opened guests for seating assign", () => {
    assert.ok(seatingAssignPriority("ACCEPTED") < seatingAssignPriority("OPENED"));
    assert.ok(seatingAssignPriority("OPENED") < seatingAssignPriority("INVITED"));
    assert.ok(seatingAssignPriority("INVITED") < seatingAssignPriority("DECLINED"));
  });

  it("labels invite engagement separately from gate admission", () => {
    assert.equal(seatingPlanningTone("OPENED"), "opened");
    assert.equal(seatingPlanningTone("ACCEPTED"), "accepted");
    assert.equal(seatingPlanningTone("CHECKED_IN"), "admitted");
    assert.equal(seatingPlanningLabel("OPENED"), "Opened invite");
    assert.equal(seatingPlanningLabel("CHECKED_IN"), "Admitted");
  });

  it("sorts guests accepted → opened → invited", () => {
    const sorted = [
      { name: "Zed", status: "INVITED" },
      { name: "Ann", status: "OPENED" },
      { name: "Bo", status: "ACCEPTED" },
    ].sort(compareGuestsForSeatingAssign);
    assert.deepEqual(
      sorted.map((g) => g.name),
      ["Bo", "Ann", "Zed"]
    );
  });
});
