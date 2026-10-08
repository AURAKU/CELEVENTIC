import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const opening = readFileSync(
  "src/components/invitation/templates/forever-afaris-wedding-opening.tsx",
  "utf8"
);

test("the wedding opening releases the page so guests can scroll", () => {
  const intro = Number(opening.match(/const INTRO_DURATION_MS = (\d+)/)?.[1]);
  const release = Number(opening.match(/const OPEN_RELEASE_MS = (\d+)/)?.[1]);
  assert.ok(intro > 0 && intro <= 800);
  assert.ok(release > 0 && release <= 1000);
  assert.match(opening, /onWheel/);
  assert.match(opening, /onTouchMove/);
  assert.match(opening, /pointerEvents = "none"/);
  assert.match(opening, /stage === "sealed" \|\| stage === "done"/);
  assert.doesNotMatch(opening, /after\(GATE_REVEAL_AT_MS/);
  assert.doesNotMatch(opening, /after\(prefersReduced \? 40 : 280, onComplete\)/);
});
