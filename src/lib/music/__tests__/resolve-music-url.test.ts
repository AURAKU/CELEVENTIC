import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMusicUrl } from "../validate-selection";

describe("resolveMusicUrl", () => {
  it("rewrites /api/uploads music to /uploads so browsers never hit localhost redirects", () => {
    const out = resolveMusicUrl(
      "/api/uploads/music/user1/track.mp3",
      "https://www.celeventic.com"
    );
    assert.equal(out, "https://www.celeventic.com/uploads/music/user1/track.mp3");
  });

  it("keeps bundled public/music library tracks", () => {
    const out = resolveMusicUrl("/music/luxury-piano-romance.mp3", "https://www.celeventic.com");
    assert.equal(out, "https://www.celeventic.com/music/luxury-piano-romance.mp3");
  });

  it("keeps already-canonical /uploads paths", () => {
    const out = resolveMusicUrl(
      "/uploads/music/user1/track.mp3",
      "https://www.celeventic.com"
    );
    assert.equal(out, "https://www.celeventic.com/uploads/music/user1/track.mp3");
  });
});
