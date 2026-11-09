import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROLE_PERMISSIONS } from "../default-role-permissions";
import { EventPermissionKey } from "../permission-keys";

test("VIEW_ONLY cannot manage guests, tickets, finances, or scan", () => {
  const keys = new Set(DEFAULT_ROLE_PERMISSIONS.VIEW_ONLY);
  assert.equal(keys.has(EventPermissionKey.VIEW_EVENT), true);
  assert.equal(keys.has(EventPermissionKey.MANAGE_GUESTS), false);
  assert.equal(keys.has(EventPermissionKey.MANAGE_TICKETS), false);
  assert.equal(keys.has(EventPermissionKey.MANAGE_FINANCES), false);
  assert.equal(keys.has(EventPermissionKey.SCAN_QR), false);
  assert.equal(keys.has(EventPermissionKey.EDIT_SEATING), false);
});

test("VENDOR cannot manage finances or tickets", () => {
  const keys = new Set(DEFAULT_ROLE_PERMISSIONS.VENDOR);
  assert.equal(keys.has(EventPermissionKey.MANAGE_FINANCES), false);
  assert.equal(keys.has(EventPermissionKey.MANAGE_TICKETS), false);
  assert.equal(keys.has(EventPermissionKey.SCAN_QR), false);
});

test("FINANCE_COORDINATOR can manage finances but not scan or edit seating", () => {
  const keys = new Set(DEFAULT_ROLE_PERMISSIONS.FINANCE_COORDINATOR);
  assert.equal(keys.has(EventPermissionKey.MANAGE_FINANCES), true);
  assert.equal(keys.has(EventPermissionKey.SCAN_QR), false);
  assert.equal(keys.has(EventPermissionKey.EDIT_SEATING), false);
});

test("OWNER has every permission key", () => {
  const keys = new Set(DEFAULT_ROLE_PERMISSIONS.OWNER);
  for (const permission of Object.values(EventPermissionKey)) {
    assert.equal(keys.has(permission), true, permission);
  }
});
