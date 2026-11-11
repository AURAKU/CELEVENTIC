import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPasswordResetUrl,
  emailFromPasswordResetIdentifier,
  hashPasswordResetToken,
  isPasswordResetIdentifier,
  newPasswordResetToken,
  normalizeResetEmail,
  passwordMeetsResetPolicy,
  passwordResetIdentifier,
  passwordResetTokenIsUsable,
  PASSWORD_RESET_PUBLIC_MESSAGE,
} from "../password-reset";

describe("password reset tokens", () => {
  it("normalizes email and namespaces the stored identifier", () => {
    assert.equal(normalizeResetEmail("  Ada@Celeventic.com "), "ada@celeventic.com");
    const id = passwordResetIdentifier("  Ada@Celeventic.com ");
    assert.equal(id, "pwdreset:ada@celeventic.com");
    assert.equal(isPasswordResetIdentifier(id), true);
    assert.equal(emailFromPasswordResetIdentifier(id), "ada@celeventic.com");
    assert.equal(isPasswordResetIdentifier("email-verify:ada@celeventic.com"), false);
  });

  it("stores a hash, never the raw token", () => {
    const issued = newPasswordResetToken();
    assert.equal(issued.token.includes(issued.tokenHash), false);
    assert.equal(hashPasswordResetToken(issued.token), issued.tokenHash);
    assert.equal(issued.expiresAt.getTime() > Date.now(), true);
  });

  it("rejects expired rows and short passwords", () => {
    assert.equal(passwordResetTokenIsUsable({ expires: new Date(Date.now() + 60_000) }), true);
    assert.equal(passwordResetTokenIsUsable({ expires: new Date(Date.now() - 1000) }), false);
    assert.equal(passwordResetTokenIsUsable(null), false);
    assert.equal(passwordMeetsResetPolicy("abcdefgh"), true);
    assert.equal(passwordMeetsResetPolicy("short"), false);
  });

  it("builds a same-origin reset URL and a non-enumerating public message", () => {
    assert.equal(
      buildPasswordResetUrl("https://www.celeventic.com/", "abc+def"),
      "https://www.celeventic.com/auth/reset-password?token=abc%2Bdef"
    );
    assert.match(PASSWORD_RESET_PUBLIC_MESSAGE, /If an account exists/);
  });
});
