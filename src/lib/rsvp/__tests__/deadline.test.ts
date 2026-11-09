import test from "node:test";
import assert from "node:assert/strict";
import { isRsvpOpen } from "../deadline";

test("open when no deadline is set", () => {
  const now = new Date("2026-11-07T10:00:00.000Z");
  assert.equal(isRsvpOpen(now, null), true);
  assert.equal(isRsvpOpen(now, undefined), true);
});

test("open on the deadline instant", () => {
  const now = new Date("2026-11-07T10:00:00.000Z");
  assert.equal(isRsvpOpen(now, new Date("2026-11-07T10:00:00.000Z")), true);
});

test("closed after the deadline", () => {
  const now = new Date("2026-11-07T10:00:01.000Z");
  assert.equal(isRsvpOpen(now, new Date("2026-11-07T10:00:00.000Z")), false);
});
