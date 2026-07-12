import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canAccessAdminPanel,
  canAccessVendorPortal,
  hasPermission,
  Permission,
  toRbacRole,
} from "../../rbac";
import { LoginFailureReason, toSafeLoginMessage } from "../login-diagnostics";
import { isBcryptHash, verifyPassword, hashPassword } from "../password";
import { isTokenIssuedBeforeInvalidation } from "../sync-user-token";

describe("RBAC", () => {
  it("grants admin panel to SUPER_ADMIN and ADMIN only", () => {
    assert.equal(canAccessAdminPanel("SUPER_ADMIN"), true);
    assert.equal(canAccessAdminPanel("ADMIN"), true);
    assert.equal(canAccessAdminPanel("ORGANIZER"), false);
    assert.equal(canAccessAdminPanel("VENDOR"), false);
  });

  it("maps ORGANIZER with org to ORGANIZATION rbac role", () => {
    assert.equal(toRbacRole("ORGANIZER", "org_123"), "ORGANIZATION");
    assert.equal(toRbacRole("ORGANIZER", null), "USER");
  });

  it("vendor portal permission only for VENDOR", () => {
    assert.equal(canAccessVendorPortal("VENDOR"), true);
    assert.equal(canAccessVendorPortal("ORGANIZER"), false);
  });

  it("super admin can force logout", () => {
    assert.equal(hasPermission({ role: "SUPER_ADMIN" }, Permission.FORCE_USER_LOGOUT), true);
    assert.equal(hasPermission({ role: "ORGANIZER" }, Permission.FORCE_USER_LOGOUT), false);
  });
});

describe("login diagnostics", () => {
  it("uses same safe message for user not found and wrong password", () => {
    const notFound = toSafeLoginMessage(LoginFailureReason.USER_NOT_FOUND);
    const wrong = toSafeLoginMessage(LoginFailureReason.WRONG_PASSWORD);
    assert.equal(notFound, wrong);
  });

  it("returns distinct message for suspended accounts", () => {
    const msg = toSafeLoginMessage(LoginFailureReason.ACCOUNT_SUSPENDED);
    assert.match(msg, /suspended/i);
  });
});

describe("password security", () => {
  it("hashes and verifies with bcrypt", async () => {
    const hash = await hashPassword("Test@Password123");
    assert.equal(isBcryptHash(hash), true);
    assert.equal(await verifyPassword("Test@Password123", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });

  it("rejects missing hash", async () => {
    assert.equal(await verifyPassword("x", null), false);
  });
});

describe("session invalidation", () => {
  it("invalidates tokens issued before force logout", () => {
    const invalidatedAt = new Date("2026-01-02T00:00:00Z");
    const iatBefore = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
    const iatAfter = Math.floor(new Date("2026-01-03T00:00:00Z").getTime() / 1000);
    assert.equal(isTokenIssuedBeforeInvalidation(iatBefore, invalidatedAt), true);
    assert.equal(isTokenIssuedBeforeInvalidation(iatAfter, invalidatedAt), false);
    assert.equal(isTokenIssuedBeforeInvalidation(undefined, invalidatedAt), false);
  });
});
