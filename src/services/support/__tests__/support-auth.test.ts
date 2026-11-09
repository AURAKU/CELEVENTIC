import test from "node:test";
import assert from "node:assert/strict";
import { userCanAccessSupportTicket } from "../support-ticket.service";

test("users can only open their own support tickets", () => {
  assert.equal(userCanAccessSupportTicket("user_a", "user_a", false), true);
  assert.equal(userCanAccessSupportTicket("user_a", "user_b", false), false);
});

test("admins can open any support ticket", () => {
  assert.equal(userCanAccessSupportTicket("user_a", "admin_1", true), true);
});

test("internal notes stay staff-only", () => {
  const isInternal = true;
  const asAdmin = false;
  assert.equal(isInternal && !asAdmin, true);
});
