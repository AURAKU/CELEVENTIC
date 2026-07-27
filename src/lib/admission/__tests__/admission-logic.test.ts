import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAllowance,
  clampAdmitted,
  deriveAdmissionState,
  canAccessPortal,
  isTerminalDenied,
  summarize,
} from "../admission-logic";

test("computeAllowance: individual, couple, group with plus-ones", () => {
  assert.equal(computeAllowance([{ plusOnes: 0 }]), 1); // single
  assert.equal(computeAllowance([{ plusOnes: 1 }]), 2); // one +1 (couple)
  assert.equal(computeAllowance([{ plusOnes: 0 }, { plusOnes: 0 }]), 2); // two rows
  assert.equal(computeAllowance([{ plusOnes: 4 }]), 5); // party of 5
  assert.equal(computeAllowance([{ plusOnes: 2 }, { plusOnes: 1 }]), 5); // 3+2 heads... (1+2)+(1+1)=5
});

test("computeAllowance: stored override wins when positive", () => {
  assert.equal(computeAllowance([{ plusOnes: 0 }], 8), 8);
  assert.equal(computeAllowance([{ plusOnes: 0 }], 0), 1); // 0 override ignored → derive
  assert.equal(computeAllowance([{ plusOnes: 0 }], null), 1);
});

test("clampAdmitted: never below zero or above allowance", () => {
  assert.equal(clampAdmitted(-3, 5), 0);
  assert.equal(clampAdmitted(9, 5), 5);
  assert.equal(clampAdmitted(3, 5), 3);
  assert.equal(clampAdmitted(2.9, 5), 2); // truncates
  assert.equal(clampAdmitted(Number.NaN, 5), 0);
});

test("deriveAdmissionState: not-admitted / partial / admitted", () => {
  assert.equal(deriveAdmissionState(0, 5), "NOT_ADMITTED");
  assert.equal(deriveAdmissionState(3, 5), "PARTIALLY_ADMITTED");
  assert.equal(deriveAdmissionState(5, 5), "ADMITTED");
  assert.equal(deriveAdmissionState(6, 5), "ADMITTED"); // clamp-independent guard
});

test("deriveAdmissionState: reset-to-zero surfaces ADMISSION_RESET", () => {
  assert.equal(deriveAdmissionState(0, 5, { wasReset: true }), "ADMISSION_RESET");
  // but a partial remainder after reset is still PARTIALLY_ADMITTED
  assert.equal(deriveAdmissionState(2, 5, { wasReset: true }), "PARTIALLY_ADMITTED");
});

test("deriveAdmissionState: terminal states always win", () => {
  assert.equal(deriveAdmissionState(5, 5, { terminal: "REVOKED" }), "REVOKED");
  assert.equal(deriveAdmissionState(3, 5, { terminal: "EXPIRED" }), "EXPIRED");
});

test("canAccessPortal: only admitted/partial unlock; reset & terminal lock", () => {
  assert.equal(canAccessPortal("ADMITTED"), true);
  assert.equal(canAccessPortal("PARTIALLY_ADMITTED"), true);
  assert.equal(canAccessPortal("NOT_ADMITTED"), false);
  assert.equal(canAccessPortal("ADMISSION_RESET"), false);
  assert.equal(canAccessPortal("REVOKED"), false);
});

test("isTerminalDenied", () => {
  assert.equal(isTerminalDenied("REVOKED"), true);
  assert.equal(isTerminalDenied("EXPIRED"), true);
  assert.equal(isTerminalDenied("ADMITTED"), false);
});

test("summarize: full lock→unlock→partial→relock lifecycle (party of 5)", () => {
  const allowance = 5;

  // Before any admission → locked
  let s = summarize(0, allowance);
  assert.equal(s.state, "NOT_ADMITTED");
  assert.equal(s.canAccessPortal, false);
  assert.equal(s.remainingCount, 5);

  // 3 of 5 admitted → unlocked, partial
  s = summarize(3, allowance);
  assert.equal(s.state, "PARTIALLY_ADMITTED");
  assert.equal(s.canAccessPortal, true);
  assert.equal(s.admittedCount, 3);
  assert.equal(s.remainingCount, 2);

  // all 5 → fully admitted
  s = summarize(5, allowance);
  assert.equal(s.state, "ADMITTED");
  assert.equal(s.remainingCount, 0);

  // reset one → back to partial, still unlocked (spec §5)
  s = summarize(4, allowance, { wasReset: true });
  assert.equal(s.state, "PARTIALLY_ADMITTED");
  assert.equal(s.canAccessPortal, true);

  // reset all → relock (spec §4/§15)
  s = summarize(0, allowance, { wasReset: true });
  assert.equal(s.state, "ADMISSION_RESET");
  assert.equal(s.canAccessPortal, false);
  assert.equal(s.remainingCount, 5);
});

test("summarize: over-admit is clamped to allowance", () => {
  const s = summarize(99, 2);
  assert.equal(s.admittedCount, 2);
  assert.equal(s.remainingCount, 0);
  assert.equal(s.state, "ADMITTED");
});
