import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  PROTECTED_TEMPLATE_SOURCE_PATHS,
  assertExperience3Protection,
  buildProtectedTemplateManifest,
  classifyLayoutStatus,
  manifestSummary,
  mayModifyLayoutInPlace,
} from "@/lib/invitation/studio3/protected-manifest";
import { PROTECTED_LAYOUT_SLUGS } from "@/lib/invitation/layout-version";

describe("Experience 3.0 protected template manifest", () => {
  it("forbids every in-place layout modification", () => {
    for (const layout of [
      ...PROTECTED_LAYOUT_SLUGS,
      "classic-gold",
      "neon-celebration-party",
      "corporate-prestige-summit",
      "brand-new-layout",
    ]) {
      assert.equal(mayModifyLayoutInPlace(layout), false);
    }
  });

  it("classifies proven layouts as PROTECTED and others as UNKNOWN (0 ELIGIBLE)", () => {
    for (const layout of PROTECTED_LAYOUT_SLUGS) {
      assert.equal(classifyLayoutStatus(layout), "PROTECTED");
    }
    assert.equal(classifyLayoutStatus("classic-gold"), "UNKNOWN");
    assert.equal(classifyLayoutStatus("neon-celebration-party"), "UNKNOWN");

    const summary = manifestSummary();
    assert.equal(summary.ELIGIBLE, 0);
    assert.equal(summary.eligibleForInPlaceEdit, 0);
    assert.equal(summary.inPlaceEditsAllowed, false);
    assert.ok(summary.PROTECTED >= PROTECTED_LAYOUT_SLUGS.length);
    assert.ok(summary.catalogSkus >= 40);
    assert.ok(summary.uniqueLayouts >= 20);
  });

  it("covers every catalogue SKU with a manifest entry", () => {
    const entries = buildProtectedTemplateManifest();
    assert.ok(entries.length > 0);
    for (const entry of entries) {
      assert.ok(entry.catalogSlug);
      assert.ok(entry.layoutSlug);
      assert.equal(entry.currentVersion, 1);
      assert.ok(["PROTECTED", "ELIGIBLE", "UNKNOWN"].includes(entry.status));
      assert.notEqual(entry.status, "ELIGIBLE");
      assert.ok(entry.evidence.length > 0);
      if (entry.status === "PROTECTED") {
        assert.equal(entry.upgradeEligibility, "v2-only");
        assert.equal(entry.risk, "critical");
      } else {
        assert.equal(entry.upgradeEligibility, "pending-production-proof");
      }
    }
  });

  it("lists protected source paths that exist on disk", () => {
    const root = process.cwd();
    for (const relative of PROTECTED_TEMPLATE_SOURCE_PATHS) {
      const absolute = path.join(root, relative);
      assert.equal(
        existsSync(absolute),
        true,
        `missing protected source path: ${relative}`
      );
    }
  });

  it("passes Experience 3.0 protection invariant assertion", () => {
    const result = assertExperience3Protection();
    assert.equal(result.ok, true);
    assert.equal(result.summary.ELIGIBLE, 0);
  });
});
