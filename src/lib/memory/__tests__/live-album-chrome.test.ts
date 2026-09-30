import test from "node:test";
import assert from "node:assert/strict";
import { SERAPHINE_LAYOUT_SLUG, SERAPHINE_MONOGRAM } from "@/lib/experience/aurelia-editorial";
import { resolveLiveAlbumPageChrome } from "../live-album-chrome";

test("preview Seraphine live album chrome uses invitation sage tokens and K&F lockup", async () => {
  const chrome = await resolveLiveAlbumPageChrome("preview-seraphine-champagne-wedding");

  assert.equal(chrome.identity.layout, SERAPHINE_LAYOUT_SLUG);
  assert.equal(chrome.identity.title, "Kojo & Fafa");
  assert.equal(chrome.identity.logoUrl, SERAPHINE_MONOGRAM);
  assert.equal(chrome.cssVars["--memory-color-surface"], "#FAFAF5");
  assert.equal(chrome.cssVars["--memory-color-accent"], "#5F7A58");
  assert.equal(chrome.cssVars["--memory-color-surface-alt"], "#F5F0E4");
});
