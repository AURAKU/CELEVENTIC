import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveLiveAlbumDeleteAccess, isLiveAlbumPreviewKey } from "../live-album-access";

describe("live album delete access", () => {
  it("guests cannot remove photographs", () => {
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: null,
        userId: null,
        organizerId: "org_1",
        hasInvitation: true,
        isPreviewAlbum: false,
      }),
      false
    );
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: "GUEST" as never,
        userId: "guest_1",
        organizerId: "org_1",
        hasInvitation: true,
        isPreviewAlbum: false,
      }),
      false
    );
  });

  it("admins and super admins can remove photographs", () => {
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: "ADMIN",
        userId: "admin_1",
        organizerId: "org_1",
        hasInvitation: true,
        isPreviewAlbum: false,
      }),
      true
    );
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: "SUPER_ADMIN",
        userId: "root",
        organizerId: null,
        hasInvitation: false,
        isPreviewAlbum: true,
      }),
      true
    );
  });

  it("only the owning organizer can remove photographs on a live invitation", () => {
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: "ORGANIZER",
        userId: "org_1",
        organizerId: "org_1",
        hasInvitation: true,
        isPreviewAlbum: false,
      }),
      true
    );
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: "ORGANIZER",
        userId: "org_other",
        organizerId: "org_1",
        hasInvitation: true,
        isPreviewAlbum: false,
      }),
      false
    );
  });

  it("preview albums allow a signed-in organizer to moderate", () => {
    assert.equal(isLiveAlbumPreviewKey("preview-seraphine-champagne-wedding"), true);
    assert.equal(
      resolveLiveAlbumDeleteAccess({
        role: "ORGANIZER",
        userId: "org_1",
        organizerId: null,
        hasInvitation: false,
        isPreviewAlbum: true,
      }),
      true
    );
  });
});
