import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getThemeHeroUrl } from "@/lib/invitation/theme-media-assets";

describe("ix3 category hero art direction (P1-4)", () => {
  it("returns category-specific heroes for Batch 1 layouts needing atmosphere", () => {
    const shower = getThemeHeroUrl("ix3-baby-shower");
    const graduation = getThemeHeroUrl("ix3-graduation");
    const concert = getThemeHeroUrl("ix3-concert-night");
    const gala = getThemeHeroUrl("ix3-corporate-gala");

    assert.match(shower, /unsplash\.com/);
    assert.match(graduation, /unsplash\.com/);
    assert.match(concert, /unsplash\.com/);
    assert.match(gala, /unsplash\.com/);

    // Heroes must differ across categories (not one shared fallback).
    const unique = new Set([shower, graduation, concert, gala]);
    assert.equal(unique.size, 4);
  });
});
