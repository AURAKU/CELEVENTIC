import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const opening = readFileSync(
  "src/components/invitation/templates/forever-afaris-wedding-opening.tsx",
  "utf8"
);

test("the wedding name card does not hold the page before it can scroll", () => {
  const duration = Number(opening.match(/const INTRO_DURATION_MS = (\d+)/)?.[1]);
  assert.ok(duration > 0 && duration <= 2000);
  assert.match(opening, /onWheel/);
  assert.match(opening, /onTouchMove/);
  assert.doesNotMatch(opening, /after\(prefersReduced \? 40 : 280, onComplete\)/);
});
