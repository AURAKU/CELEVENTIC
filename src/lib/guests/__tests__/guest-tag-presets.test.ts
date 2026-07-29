import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  slugifyGuestTagLabel,
  WEDDING_GUEST_TAG_PRESETS,
} from "@/lib/guests/guest-tag-presets";

describe("wedding guest tag presets", () => {
  it("covers bride/groom family, friends, work, and school sides", () => {
    const labels = WEDDING_GUEST_TAG_PRESETS.map((preset) => preset.label);
    assert.ok(labels.includes("Family of bride"));
    assert.ok(labels.includes("Family of groom"));
    assert.ok(labels.includes("Friends of bride"));
    assert.ok(labels.includes("Friends of groom"));
    assert.ok(labels.includes("Work colleagues of bride"));
    assert.ok(labels.includes("Work colleagues of groom"));
    assert.ok(labels.includes("School mates of bride"));
    assert.ok(labels.includes("School mates of groom"));
    assert.equal(WEDDING_GUEST_TAG_PRESETS.length, 8);
  });

  it("uses unique stable slugs", () => {
    const slugs = WEDDING_GUEST_TAG_PRESETS.map((preset) => preset.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });
});

describe("slugifyGuestTagLabel", () => {
  it("normalizes custom labels for event-scoped uniqueness", () => {
    assert.equal(slugifyGuestTagLabel("  Church Family  "), "church-family");
    assert.equal(slugifyGuestTagLabel("School Mates of Bride"), "school-mates-of-bride");
  });

  it("falls back when the label has no alphanumeric characters", () => {
    assert.equal(slugifyGuestTagLabel("!!!"), "custom-tag");
  });
});
