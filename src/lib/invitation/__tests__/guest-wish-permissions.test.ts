import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveWishCapabilities,
  viewerCanDeleteWish,
  viewerCanEditWish,
} from "../guest-wish-permissions";

describe("guest wish permissions", () => {
  it("enforces organizer-only edit and delete", () => {
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: false, hasValidAuthorToken: false }),
      { canAdd: true, canDelete: false, canEdit: false }
    );
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: false, hasValidAuthorToken: true }),
      { canAdd: true, canDelete: false, canEdit: false }
    );
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: true, hasValidAuthorToken: false }),
      { canAdd: true, canDelete: true, canEdit: true }
    );
  });

  it("never shows trash to guests, even with an owned author token", () => {
    assert.equal(viewerCanDeleteWish({ canModerate: false, ownedToken: null }), false);
    assert.equal(viewerCanDeleteWish({ canModerate: false, ownedToken: "mine" }), false);
    assert.equal(viewerCanDeleteWish({ canModerate: true, ownedToken: null }), true);
  });

  it("reserves edit UI for organizers and platform admins", () => {
    assert.equal(viewerCanEditWish(false), false);
    assert.equal(viewerCanEditWish(true), true);
  });
});
