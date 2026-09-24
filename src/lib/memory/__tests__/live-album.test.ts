import test from "node:test";
import assert from "node:assert/strict";
import { liveAlbumKey, liveAlbumPaths } from "@/lib/memory/live-album";

test("liveAlbumKey is URL-safe and stable", () => {
  assert.equal(liveAlbumKey("preview-aurelia-editorial-wedding"), "preview-aurelia-editorial-wedding");
  assert.equal(liveAlbumKey("  Hello World!!  "), "hello-world");
  assert.equal(liveAlbumKey(""), "album");
  assert.equal(liveAlbumKey("***"), "album");
});

test("liveAlbumPaths encode lens and gallery routes", () => {
  const paths = liveAlbumPaths("preview-aurelia-editorial-wedding");
  assert.equal(paths.key, "preview-aurelia-editorial-wedding");
  assert.equal(paths.api, "/api/memory/live-album/preview-aurelia-editorial-wedding");
  assert.equal(paths.album, "/memory/live/preview-aurelia-editorial-wedding");
  assert.equal(paths.lens, "/memory/live/preview-aurelia-editorial-wedding?lens=1");
});
