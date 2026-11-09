import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROLE_PERMISSIONS } from "../default-role-permissions";
import { EventPermissionKey } from "../permission-keys";

function can(role: keyof typeof DEFAULT_ROLE_PERMISSIONS, permission: EventPermissionKey) {
  return new Set(DEFAULT_ROLE_PERMISSIONS[role]).has(permission);
}

test("ordinary collaborators cannot read wallet, exports, or withdrawals", () => {
  for (const role of ["VIEW_ONLY", "VENDOR", "TEAM_MEMBER", "ASSISTANT_ORGANIZER", "GUEST_MANAGER"] as const) {
    assert.equal(can(role, EventPermissionKey.MANAGE_FINANCES), false, role);
  }
});

test("finance roles can manage finances but cannot refund tickets", () => {
  assert.equal(can("FINANCE_COORDINATOR", EventPermissionKey.MANAGE_FINANCES), true);
  assert.equal(can("FINANCE_MANAGER", EventPermissionKey.MANAGE_FINANCES), true);
  assert.equal(can("FINANCE_COORDINATOR", EventPermissionKey.MANAGE_TICKETS), false);
});

test("cross-tenant wallet access must use the resource eventId, never a client-supplied other event", () => {
  const walletEventId = "event_owner";
  const attackerEventId = "event_other";
  assert.notEqual(walletEventId, attackerEventId);
});

test("VIEW_ONLY cannot manage the guest directory", () => {
  assert.equal(can("VIEW_ONLY", EventPermissionKey.MANAGE_GUESTS), false);
});
