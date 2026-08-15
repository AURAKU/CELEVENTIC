import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveMemoryVariantUrls,
  hasMemoryDerivative,
  pickMemoryFullSrc,
  pickMemoryGridSrc,
  pickMemoryPhotoSrcSet,
} from "../memory-media-urls";

describe("memory media progressive URLs", () => {
  it("uses thumbnail for grid when present", () => {
    const item = {
      mediaType: "image",
      mediaUrl: "/uploads/memories/e1/full.webp",
      thumbnailUrl: "/uploads/memories/e1/full-thumb.webp",
    };
    assert.equal(pickMemoryGridSrc(item), item.thumbnailUrl);
    assert.equal(pickMemoryFullSrc(item), "/uploads/memories/e1/full-large.webp");
    assert.equal(hasMemoryDerivative(item), true);
  });

  it("derives medium/large siblings from optimised webp masters", () => {
    const variants = deriveMemoryVariantUrls("/uploads/memories/e1/shot.webp");
    assert.equal(variants.medium, "/uploads/memories/e1/shot-medium.webp");
    assert.equal(variants.large, "/uploads/memories/e1/shot-large.webp");
    assert.equal(variants.original, "/uploads/memories/e1/shot-original.jpg");
  });

  it("builds a responsive photo srcset for lightbox", () => {
    const item = {
      mediaType: "image",
      mediaUrl: "/uploads/memories/e1/shot.webp",
      thumbnailUrl: "/uploads/memories/e1/shot-thumb.webp",
    };
    const srcset = pickMemoryPhotoSrcSet(item);
    assert.ok(srcset);
    assert.match(srcset!, /shot-medium\.webp 1200w/);
    assert.match(srcset!, /shot-large\.webp 2000w/);
  });

  it("falls back to mediaUrl when no thumbnail (legacy rows)", () => {
    const item = { mediaType: "image", mediaUrl: "/uploads/memories/e1/a.jpg", thumbnailUrl: null };
    assert.equal(pickMemoryGridSrc(item), item.mediaUrl);
    assert.equal(pickMemoryFullSrc(item), item.mediaUrl);
    assert.equal(hasMemoryDerivative(item), false);
  });

  it("uses video poster in grid, full media for viewer", () => {
    const item = {
      mediaType: "video",
      mediaUrl: "/uploads/memories/e1/clip.mp4",
      thumbnailUrl: "/uploads/memories/e1/clip-poster.jpg",
    };
    assert.equal(pickMemoryGridSrc(item), item.thumbnailUrl);
    assert.equal(pickMemoryFullSrc(item), item.mediaUrl);
  });

  it("never uses video file as grid src when poster exists", () => {
    const item = {
      mediaType: "video",
      mediaUrl: "/uploads/memories/e1/clip.mp4",
      thumbnailUrl: "/uploads/memories/e1/clip-poster.jpg",
    };
    const grid = pickMemoryGridSrc(item);
    assert.notEqual(grid, item.mediaUrl);
    assert.match(grid, /\.(jpe?g|webp|png)$/i);
  });
});
