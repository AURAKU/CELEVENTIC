import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveWishCapabilities,
  viewerCanDeleteWish,
  viewerCanEditWish,
} from "../guest-wish-permissions";

describe("guest wish permissions", () => {
  it("enforces the product matrix for add / edit / delete", () => {
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: false, hasValidAuthorToken: false }),
      { canAdd: true, canDelete: false, canEdit: false }
    );
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: false, hasValidAuthorToken: true }),
      { canAdd: true, canDelete: true, canEdit: false }
    );
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: true, hasValidAuthorToken: false }),
      { canAdd: true, canDelete: true, canEdit: true }
    );
  });

  it("hides trash from guests who do not own the wish token", () => {
    assert.equal(viewerCanDeleteWish({ canModerate: false, ownedToken: null }), false);
    assert.equal(viewerCanDeleteWish({ canModerate: false, ownedToken: "mine" }), true);
    assert.equal(viewerCanDeleteWish({ canModerate: true, ownedToken: null }), true);
  });

  it("reserves edit UI for organizers and platform admins", () => {
    assert.equal(viewerCanEditWish(false), false);
    assert.equal(viewerCanEditWish(true), true);
  });
});
