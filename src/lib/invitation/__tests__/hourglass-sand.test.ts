import test from "node:test";
import assert from "node:assert/strict";
import { hourglassSandLevel, SERAPHINE_HOURGLASS_MS } from "../hourglass-sand";

const DAY = 24 * 60 * 60 * 1000;

test("the lower chamber is full when the hour arrives", () => {
  assert.deepEqual(hourglassSandLevel(0, true), { remain: 0, spent: 1 });
  assert.deepEqual(hourglassSandLevel(0, false), { remain: 0, spent: 1 });
});

test("a full wait keeps every heart in the upper chamber", () => {
  assert.deepEqual(hourglassSandLevel(SERAPHINE_HOURGLASS_MS, false), { remain: 1, spent: 0 });
  assert.deepEqual(hourglassSandLevel(SERAPHINE_HOURGLASS_MS + 10 * DAY, false), { remain: 1, spent: 0 });
});

test("hearts already dropped rest in the lower chamber and grow as time passes", () => {
  const early = hourglassSandLevel(90 * DAY, false);
  const later = hourglassSandLevel(30 * DAY, false);
  assert.ok(early.spent > 0 && early.spent < 1);
  assert.ok(later.spent > early.spent);
  assert.ok(later.remain < early.remain);
  assert.equal(Math.round((early.remain + early.spent) * 1000), 1000);
});
