import test from "node:test";
import assert from "node:assert/strict";

import {
  OPENING_EXPERIENCES,
  previewTapLabelForOpening,
  previewTapStepsForOpening,
} from "@/lib/experience/opening-experiences";

/**
 * The catalogue affordance promises an experience, so its copy must name the
 * gesture and the beats that answer it — never just re-describe the artwork.
 */

test("satin bow affordance names the untie gesture, not the card description", () => {
  const copy = previewTapLabelForOpening("satin-bow");
  assert.equal(copy.label, "Tap to untie the bow");
  assert.deepEqual(copy.steps, ["Bow unties", "Invite opens"]);
  assert.notEqual(copy.subtitle, "Ivory card tied with a satin bow — tap to untie");
});

test("music cue is spliced onto the opening gesture, not the arrival", () => {
  assert.deepEqual(previewTapStepsForOpening("satin-bow", true), [
    "Bow unties",
    "Music begins",
    "Invite opens",
  ]);
  assert.deepEqual(previewTapStepsForOpening("satin-bow", true, "Pastel Garden Cheer"), [
    "Bow unties",
    "Pastel Garden Cheer plays",
    "Invite opens",
  ]);
  assert.deepEqual(previewTapStepsForOpening("satin-bow", false), [
    "Bow unties",
    "Invite opens",
  ]);
});

test("envelope and curtain families keep their mechanic-specific beats", () => {
  assert.deepEqual(previewTapLabelForOpening("wax-seal-gold").steps, [
    "Seal lifts",
    "Invite reveals",
  ]);
  assert.deepEqual(previewTapLabelForOpening("curtain-wedding").steps, [
    "Curtains part",
    "Invite reveals",
  ]);
  assert.deepEqual(previewTapLabelForOpening("blush-gate").steps, [
    "Seal lifts",
    "Golden gate opens",
  ]);
});

test("every opening yields a tappable label and exactly two beats", () => {
  for (const meta of OPENING_EXPERIENCES) {
    const copy = previewTapLabelForOpening(meta.id);
    assert.ok(copy.label.length > 0, `${meta.id} has no label`);
    assert.equal(copy.steps.length, 2, `${meta.id} should describe two beats`);
    for (const step of copy.steps) {
      assert.ok(step.trim().length > 0, `${meta.id} has an empty beat`);
    }
  }
});

test("unknown and absent openings degrade to a safe invitation label", () => {
  assert.equal(previewTapLabelForOpening(undefined).label, "Tap to view invitation");
  assert.equal(previewTapLabelForOpening("none").label, "Tap to view invitation");
  assert.equal(previewTapLabelForOpening("not-a-real-opening").label, "Tap to view invitation");
  assert.equal(previewTapStepsForOpening("not-a-real-opening", true).length, 3);
});
