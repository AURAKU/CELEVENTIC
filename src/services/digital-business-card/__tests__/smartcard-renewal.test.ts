import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dueRenewalWindow } from "../smartcard-renewal.service";
import { dueReminderOffsetDays } from "@/lib/digital-business-card/lifecycle";

function hoursFromNow(hours: number, now: Date) {
  return new Date(now.getTime() + hours * 3_600_000);
}

describe("dueRenewalWindow", () => {
  const now = new Date("2026-11-07T12:00:00.000Z");

  it("waits until the 72 hour window", () => {
    assert.equal(dueRenewalWindow(hoursFromNow(80, now), now), null);
    assert.equal(dueRenewalWindow(hoursFromNow(72, now), now), 72);
    assert.equal(dueRenewalWindow(hoursFromNow(50, now), now), 72);
  });

  it("tightens to 48 then 24 then expiry", () => {
    assert.equal(dueRenewalWindow(hoursFromNow(48, now), now), 48);
    assert.equal(dueRenewalWindow(hoursFromNow(24.5, now), now), 48);
    assert.equal(dueRenewalWindow(hoursFromNow(24, now), now), 24);
    assert.equal(dueRenewalWindow(hoursFromNow(1, now), now), 24);
    assert.equal(dueRenewalWindow(hoursFromNow(0, now), now), 0);
    assert.equal(dueRenewalWindow(hoursFromNow(-2, now), now), 0);
  });

  it("uses day offsets for the Continuity reminder engine", () => {
    assert.equal(dueReminderOffsetDays(hoursFromNow(24 * 14, now), now), 14);
    assert.equal(dueReminderOffsetDays(hoursFromNow(-24 * 3, now), now), -3);
  });
});
