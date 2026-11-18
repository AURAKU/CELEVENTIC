import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import {
  CATALOG_TRANSFORMATION_ROWS,
  catalogTransformSummary,
} from "@/lib/invitation/studio3/catalog-transformation-map";
import { EXPERIENCE3_NATIVE_LAYOUT_SLUGS } from "@/lib/invitation/studio3/native-layouts";
import { mayModifyLayoutInPlace } from "@/lib/invitation/studio3/protected-manifest";

describe("Phase 5 catalog transformation map", () => {
  it("maps every catalogue SKU exactly once", () => {
    const summary = catalogTransformSummary();
    assert.equal(summary.mappingComplete, true);
    assert.equal(summary.skuMapped, CATALOG_TEMPLATES.length);
    assert.equal(summary.skuMapped, 48);

    const slugs = CATALOG_TRANSFORMATION_ROWS.map((row) => row.catalogSlug);
    assert.equal(new Set(slugs).size, slugs.length);

    for (const template of CATALOG_TEMPLATES) {
      assert.ok(
        slugs.includes(template.slug),
        `missing transform row for ${template.slug}`
      );
    }
  });

  it("never proposes in-place modification of originals", () => {
    for (const row of CATALOG_TRANSFORMATION_ROWS) {
      assert.equal(mayModifyLayoutInPlace(row.originalLayout), false);
      assert.notEqual(row.proposedSuccessor, row.originalLayout);
      assert.ok(row.proposedSuccessor.startsWith("ix3-"));
    }
  });

  it("points successors at registered Experience 3.0 native layouts", () => {
    const natives = new Set(EXPERIENCE3_NATIVE_LAYOUT_SLUGS);
    for (const row of CATALOG_TRANSFORMATION_ROWS) {
      assert.ok(
        natives.has(row.proposedSuccessor as (typeof EXPERIENCE3_NATIVE_LAYOUT_SLUGS)[number]),
        `unknown successor ${row.proposedSuccessor}`
      );
    }
  });

  it("does not claim 100% visual redesign completion", () => {
    const summary = catalogTransformSummary();
    assert.equal(summary.fullyVisualRedesigns, 0);
    assert.ok(summary.visualPct < 100);
  });
});
