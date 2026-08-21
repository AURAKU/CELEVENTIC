import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FUNERAL_ENVELOPE_SEAL_BY_SLUG,
  isWeddingStyleSealMonogram,
} from "@/lib/invitation/funeral-envelope-seal";
import { CATALOG_MUSIC_IDENTITY } from "@/lib/invitation/catalog-music-identity";
import { SEAL_DESIGN_PRESETS } from "@/lib/invitation/seal-design";

const CHEERFUL_FUNERAL_FILES = new Set([
  "jazz-midnight",
  "jazz-soft-lounge",
  "happy-celebration",
  "party-edm-energy",
  "african-drums-celebration",
  "acoustic-warm",
]);

describe("funeral envelope seals", () => {
  it("assigns a unique wax design and emblem to every funeral SKU", () => {
    const designs = Object.values(FUNERAL_ENVELOPE_SEAL_BY_SLUG).map((s) => s.design);
    const emblems = Object.values(FUNERAL_ENVELOPE_SEAL_BY_SLUG).map((s) => s.emblem);
    assert.equal(new Set(designs).size, designs.length, "wax designs must be unique");
    assert.equal(new Set(emblems).size, emblems.length, "emblems must be unique");
    for (const design of designs) {
      assert.ok(
        SEAL_DESIGN_PRESETS.some((p) => p.id === design),
        `missing seal preset ${design}`
      );
      assert.notEqual(design, "classic-peach-pearl");
    }
    for (const emblem of emblems) {
      assert.equal(isWeddingStyleSealMonogram(emblem), false);
    }
  });
});

describe("funeral catalog music", () => {
  it("uses calm memorial tracks — never jazz/party/celebration files", () => {
    const funeralEntries = Object.entries(CATALOG_MUSIC_IDENTITY).filter(
      ([, profile]) => profile.category === "funeral"
    );
    assert.ok(funeralEntries.length >= 10, "expected funeral catalog music entries");
    for (const [slug, profile] of funeralEntries) {
      assert.equal(profile.category, "funeral", slug);
      assert.ok(!CHEERFUL_FUNERAL_FILES.has(profile.bundledFile), `${slug} uses ${profile.bundledFile}`);
      assert.ok(profile.volume <= 0.32, `${slug} volume should stay soft`);
      assert.ok(profile.fadeInSec >= 3, `${slug} should fade in gently`);
    }
  });
});
