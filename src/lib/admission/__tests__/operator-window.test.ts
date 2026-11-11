import { test } from "node:test";
import assert from "node:assert/strict";
import { operatorMayBypassAdmissionWindow } from "../operator-window";

test("platform admins may admit before the gate window", () => {
  assert.equal(
    operatorMayBypassAdmissionWindow({ role: "SUPER_ADMIN", userId: "u1", organizerId: "org" }),
    true
  );
  assert.equal(
    operatorMayBypassAdmissionWindow({ role: "ADMIN", userId: "u1", organizerId: "org" }),
    true
  );
});

test("the event organiser may admit before the gate window", () => {
  assert.equal(
    operatorMayBypassAdmissionWindow({
      role: "ORGANIZER",
      userId: "host",
      organizerId: "host",
    }),
    true
  );
});

test("door staff and guests still wait for the window", () => {
  assert.equal(
    operatorMayBypassAdmissionWindow({
      role: "STAFF",
      userId: "door",
      organizerId: "host",
    }),
    false
  );
  assert.equal(
    operatorMayBypassAdmissionWindow({
      role: "ORGANIZER",
      userId: "other-host",
      organizerId: "host",
    }),
    false
  );
  assert.equal(operatorMayBypassAdmissionWindow({}), false);
});
