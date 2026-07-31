import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  resolveWishCapabilities,
  viewerCanDeleteWish,
  viewerCanEditWish,
} from "@/lib/invitation/guest-wish-permissions";
import { authorTokenMatches } from "../guest-wish.service";

describe("guest wish author delete token", () => {
  it("accepts the exact token that produced the stored hash", () => {
    const token = randomBytes(24).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(authorTokenMatches(hash, token), true);
  });

  it("rejects a different token, empty token, or missing hash", () => {
    const token = randomBytes(24).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(authorTokenMatches(hash, "not-the-token"), false);
    assert.equal(authorTokenMatches(hash, ""), false);
    assert.equal(authorTokenMatches(null, token), false);
    assert.equal(authorTokenMatches(undefined, token), false);
  });
});

describe("wish permission matrix", () => {
  it("anonymous / guest: add only — no delete, no edit", () => {
    const caps = resolveWishCapabilities({
      isModerator: false,
      hasValidAuthorToken: false,
    });
    assert.deepEqual(caps, { canAdd: true, canDelete: false, canEdit: false });
  });

  it("author token no longer grants delete", () => {
    const caps = resolveWishCapabilities({
      isModerator: false,
      hasValidAuthorToken: true,
    });
    assert.deepEqual(caps, { canAdd: true, canDelete: false, canEdit: false });
  });

  it("organizer / platform admin: add, edit, and delete any", () => {
    const caps = resolveWishCapabilities({
      isModerator: true,
      hasValidAuthorToken: false,
    });
    assert.deepEqual(caps, { canAdd: true, canDelete: true, canEdit: true });
  });

  it("moderator still edits even when also holding an author token", () => {
    const caps = resolveWishCapabilities({
      isModerator: true,
      hasValidAuthorToken: true,
    });
    assert.deepEqual(caps, { canAdd: true, canDelete: true, canEdit: true });
  });
});

describe("wish card affordance gating", () => {
  it("never shows trash for a regular guest", () => {
    assert.equal(
      viewerCanDeleteWish({ canModerate: false, ownedToken: null }),
      false
    );
    assert.equal(
      viewerCanDeleteWish({ canModerate: false, ownedToken: "tok_abc" }),
      false
    );
  });

  it("shows trash only for organizers and platform admins", () => {
    assert.equal(
      viewerCanDeleteWish({ canModerate: true, ownedToken: null }),
      true
    );
  });

  it("shows edit only for organizers/admins — never for guests", () => {
    assert.equal(viewerCanEditWish(false), false);
    assert.equal(viewerCanEditWish(true), true);
  });
});
