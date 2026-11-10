import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Permission } from "@/lib/rbac/types";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  bulkActionIsEnabled,
  canGrantComplimentary,
  canPerformCeleCardAction,
} from "@/lib/digital-business-card/admin-permissions";

describe("CeleYou admin permissions", () => {
  it("lets platform admins view and operate cards", () => {
    assert.equal(hasPermission({ role: "ADMIN" }, Permission.CELECARD_VIEW), true);
    assert.equal(hasPermission({ role: "ADMIN" }, Permission.CELECARD_CREATE), true);
    assert.equal(hasPermission({ role: "ADMIN" }, Permission.CELECARD_SUSPEND), true);
    assert.equal(canPerformCeleCardAction({ role: "ADMIN" }, "deactivate"), true);
  });

  it("reserves complimentary grants and price changes for super admins", () => {
    assert.equal(canGrantComplimentary({ role: "ADMIN" }), false);
    assert.equal(canGrantComplimentary({ role: "SUPER_ADMIN" }), true);
    assert.equal(hasPermission({ role: "ADMIN" }, Permission.CELECARD_GRANT_COMPLIMENTARY), false);
    assert.equal(hasPermission({ role: "ADMIN" }, Permission.CELECARD_PRICING_MANAGE), false);
    assert.equal(hasPermission({ role: "SUPER_ADMIN" }, Permission.CELECARD_PRICING_MANAGE), true);
    assert.equal(canPerformCeleCardAction({ role: "ADMIN" }, "complimentary"), false);
    assert.equal(canPerformCeleCardAction({ role: "SUPER_ADMIN" }, "complimentary"), true);
  });

  it("denies organizers and guests", () => {
    assert.equal(hasPermission({ role: "ORGANIZER" }, Permission.CELECARD_ACTIVATE), false);
    assert.equal(hasPermission({ role: "GUEST" }, Permission.ACCESS_ADMIN_PANEL), false);
    assert.equal(hasPermission({ role: "STAFF" }, Permission.CELECARD_VIEW), false);
  });

  it("does not enable unrestricted bulk activation", () => {
    assert.equal(bulkActionIsEnabled("preview"), true);
    assert.equal(bulkActionIsEnabled("activate"), false);
    assert.equal(bulkActionIsEnabled("deactivate"), false);
    assert.equal(bulkActionIsEnabled("complimentary"), false);
  });
});
