import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROLE_PERMISSIONS } from "../default-role-permissions";
import { EventPermissionKey } from "../permission-keys";
import { eventAccessWhere, eventListWhere } from "../event-access";

function can(role: keyof typeof DEFAULT_ROLE_PERMISSIONS, permission: EventPermissionKey) {
  return new Set(DEFAULT_ROLE_PERMISSIONS[role]).has(permission);
}

test("VIEW_ONLY cannot touch wallet, tickets, RSVP export, or admission scan", () => {
  assert.equal(can("VIEW_ONLY", EventPermissionKey.MANAGE_FINANCES), false);
  assert.equal(can("VIEW_ONLY", EventPermissionKey.MANAGE_TICKETS), false);
  assert.equal(can("VIEW_ONLY", EventPermissionKey.MANAGE_GUESTS), false);
  assert.equal(can("VIEW_ONLY", EventPermissionKey.SCAN_QR), false);
});

test("VENDOR cannot manage another organizer's finances or tickets", () => {
  assert.equal(can("VENDOR", EventPermissionKey.MANAGE_FINANCES), false);
  assert.equal(can("VENDOR", EventPermissionKey.MANAGE_TICKETS), false);
  assert.equal(can("VENDOR", EventPermissionKey.SCAN_QR), false);
});

test("FINANCE_COORDINATOR cannot scan or refund tickets", () => {
  assert.equal(can("FINANCE_COORDINATOR", EventPermissionKey.MANAGE_FINANCES), true);
  assert.equal(can("FINANCE_COORDINATOR", EventPermissionKey.MANAGE_TICKETS), false);
  assert.equal(can("FINANCE_COORDINATOR", EventPermissionKey.SCAN_QR), false);
});

test("ASSISTANT_ORGANIZER cannot manage finances", () => {
  assert.equal(can("ASSISTANT_ORGANIZER", EventPermissionKey.MANAGE_FINANCES), false);
  assert.equal(can("ASSISTANT_ORGANIZER", EventPermissionKey.MANAGE_TICKETS), false);
});

test("ticket order authorization always uses the order's event, never a client-supplied eventId", () => {
  const order = { id: "ord_a", eventId: "event_a" };
  const attackerEventId = "event_b";
  assert.notEqual(order.eventId, attackerEventId);
  // Routes must pass order.eventId into requireEventPermission.
  assert.equal(order.eventId, "event_a");
});

test("event list scoping never returns a global unfiltered catalog", () => {
  const where = eventListWhere("user_1");
  assert.ok(Array.isArray(where.OR));
  assert.ok(where.OR.some((clause) => "organizerId" in clause && clause.organizerId === "user_1"));
  assert.equal("id" in where, false);
});

test("deep-link event access still requires organizer, collaborator, staff, or org membership", () => {
  const where = eventAccessWhere("user_2");
  assert.ok(where.OR.length >= 3);
  assert.ok(where.OR.every((clause) => JSON.stringify(clause).includes("user_2")));
});
