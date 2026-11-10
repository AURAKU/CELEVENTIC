import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimInviteIsUsable,
  emailsMatchForClaim,
  hashCeleCardClaimToken,
  isUnclaimedHolderEmail,
  newCeleCardClaimToken,
  normalizeClaimEmail,
} from "@/lib/digital-business-card/claim-token";

describe("CeleYou claim tokens", () => {
  it("hashes tokens and never treats two generated secrets as equal", () => {
    const first = newCeleCardClaimToken();
    const second = newCeleCardClaimToken();
    assert.notEqual(first.token, second.token);
    assert.equal(first.tokenHash, hashCeleCardClaimToken(first.token));
    assert.notEqual(first.tokenHash, first.token);
  });

  it("rejects consumed, expired, and missing invites", () => {
    const now = new Date("2026-11-09T12:00:00.000Z");
    assert.equal(claimInviteIsUsable(null, now), false);
    assert.equal(
      claimInviteIsUsable({ expiresAt: new Date(now.getTime() + 1000), consumedAt: now }, now),
      false
    );
    assert.equal(claimInviteIsUsable({ expiresAt: new Date(now.getTime() - 1000) }, now), false);
    assert.equal(claimInviteIsUsable({ expiresAt: new Date(now.getTime() + 1000) }, now), true);
  });

  it("matches claim email case-insensitively and rejects the internal holder mailbox", () => {
    assert.equal(normalizeClaimEmail("  Ada@Celeventic.com "), "ada@celeventic.com");
    assert.equal(emailsMatchForClaim("Ada@Celeventic.com", "ada@celeventic.com"), true);
    assert.equal(emailsMatchForClaim("ada@celeventic.com", "other@celeventic.com"), false);
    assert.equal(isUnclaimedHolderEmail("celecard.unclaimed@internal.celeventic"), true);
  });
});
