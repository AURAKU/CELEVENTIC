import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AURELIA_CATALOG_SLUG,
  SERAPHINE_CATALOG_SLUG,
} from "@/lib/experience/aurelia-editorial";
import {
  getBrowseCatalogTemplates,
  getCatalogTemplate,
  isCatalogTemplatePubliclyListed,
} from "@/lib/invitation-mvp/catalogue";
import { getUniqueTemplatePresets } from "@/lib/invitation-templates";

describe("catalogue hide/unhide overlay", () => {
  it("resolves hidden SKUs by direct slug while keeping them off public browse", () => {
    const seraphine = getCatalogTemplate(SERAPHINE_CATALOG_SLUG);
    assert.ok(seraphine, "direct template link must resolve Seraphine while hidden");
    assert.equal(seraphine.listed, false);
    assert.equal(isCatalogTemplatePubliclyListed(seraphine), false);
    assert.equal(
      getBrowseCatalogTemplates().some((template) => template.slug === SERAPHINE_CATALOG_SLUG),
      false
    );
    assert.equal(
      getUniqueTemplatePresets().some((preset) => preset.slug === SERAPHINE_CATALOG_SLUG),
      false
    );
  });

  it("lets admin include hidden SKUs and reveal them without changing the original", () => {
    const seraphine = getCatalogTemplate(SERAPHINE_CATALOG_SLUG)!;
    assert.equal(
      isCatalogTemplatePubliclyListed(seraphine, { includeHidden: true }),
      true
    );
    assert.equal(
      isCatalogTemplatePubliclyListed(seraphine, { revealedSlugs: [SERAPHINE_CATALOG_SLUG] }),
      true
    );
    const revealed = getBrowseCatalogTemplates({ revealedSlugs: [SERAPHINE_CATALOG_SLUG] });
    assert.ok(revealed.some((template) => template.slug === SERAPHINE_CATALOG_SLUG));
    assert.ok(revealed.some((template) => template.slug === AURELIA_CATALOG_SLUG));
  });

  it("hides a listed template from browse while the shared link still resolves", () => {
    const aurelia = getCatalogTemplate(AURELIA_CATALOG_SLUG);
    assert.ok(aurelia);
    assert.equal(isCatalogTemplatePubliclyListed(aurelia), true);
    assert.equal(
      isCatalogTemplatePubliclyListed(aurelia, { hiddenSlugs: [AURELIA_CATALOG_SLUG] }),
      false
    );
    assert.equal(
      getBrowseCatalogTemplates({ hiddenSlugs: [AURELIA_CATALOG_SLUG] }).some(
        (template) => template.slug === AURELIA_CATALOG_SLUG
      ),
      false
    );
    assert.ok(getCatalogTemplate(AURELIA_CATALOG_SLUG));
  });
});
