import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMemorialHonoureePortraitUrl } from "@/lib/experience/memorial-portrait";

describe("resolveMemorialHonoureePortraitUrl", () => {
  it("prefers envelope media, then intro, hero, then cover", () => {
    assert.equal(
      resolveMemorialHonoureePortraitUrl({
        coverImageUrl: "/cover.jpg",
        media: [
          { url: "/hero.jpg", role: "hero", type: "image" },
          { url: "/intro.jpg", role: "intro", type: "image" },
          { url: "/envelope.jpg", role: "envelope", type: "image" },
        ],
      }),
      "/envelope.jpg"
    );
    assert.equal(
      resolveMemorialHonoureePortraitUrl({
        coverImageUrl: "/cover.jpg",
        media: [
          { url: "/hero.jpg", role: "hero", type: "image" },
          { url: "/intro.jpg", role: "intro", type: "image" },
        ],
      }),
      "/intro.jpg"
    );
    assert.equal(
      resolveMemorialHonoureePortraitUrl({
        coverImageUrl: "/cover.jpg",
        media: [{ url: "/hero.jpg", role: "hero", type: "image" }],
      }),
      "/hero.jpg"
    );
    assert.equal(
      resolveMemorialHonoureePortraitUrl({
        coverImageUrl: "/cover.jpg",
        media: [],
      }),
      "/cover.jpg"
    );
  });

  it("ignores empty video slots and returns null when nothing is set", () => {
    assert.equal(
      resolveMemorialHonoureePortraitUrl({
        media: [{ url: "/clip.mp4", role: "hero", type: "video" }],
      }),
      null
    );
    assert.equal(resolveMemorialHonoureePortraitUrl({}), null);
  });
});
