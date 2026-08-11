import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  resolveMemoryCommentCapabilities,
  viewerCanDeleteMemoryComment,
  viewerCanDeleteMemoryMedia,
} from "../memory-social-permissions";
import {
  hashMemoryAuthorToken,
  memoryAuthorTokenMatches,
} from "../memory-guest-identity";

describe("memory social permissions", () => {
  it("guests can add comments but not delete without token", () => {
    const caps = resolveMemoryCommentCapabilities({ isModerator: false });
    assert.equal(caps.canAdd, true);
    assert.equal(caps.canDelete, false);
  });

  it("author token unlocks delete-own comment", () => {
    assert.equal(
      viewerCanDeleteMemoryComment({ canModerate: false, ownedToken: "token" }),
      true
    );
  });

  it("moderators can delete any comment", () => {
    assert.equal(viewerCanDeleteMemoryComment({ canModerate: true }), true);
  });

  it("guests may delete own media; others cannot", () => {
    assert.equal(viewerCanDeleteMemoryMedia({ canModerate: false, isOwner: false }), false);
    assert.equal(viewerCanDeleteMemoryMedia({ canModerate: false, isOwner: true }), true);
    assert.equal(viewerCanDeleteMemoryMedia({ canModerate: true, isOwner: false }), true);
  });

  it("author token hash matches", () => {
    const token = randomBytes(24).toString("base64url");
    const hash = hashMemoryAuthorToken(token);
    assert.equal(memoryAuthorTokenMatches(hash, token), true);
    assert.equal(memoryAuthorTokenMatches(hash, "nope"), false);
  });
});
