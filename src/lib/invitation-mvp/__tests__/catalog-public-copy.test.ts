import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBrowseCatalogTemplates, CATALOG_TEMPLATES } from "../catalogue";
import {
  CATALOG_DEMO_IDENTITIES,
  PUBLIC_CATALOG_COPY,
} from "../catalog-public-copy";
import { getDemoContentForCategory } from "../demo-preview-data";
import { catalogDemoLeaksClientIdentity } from "../catalog-demo-boards";

const PUNCTUATION_DASH = /[—–‐‑‒―−]|-/;

describe("catalogue public copy", () => {
  it("covers every catalogue SKU with guest-facing copy and demo identity", () => {
    for (const template of CATALOG_TEMPLATES) {
      assert.ok(PUBLIC_CATALOG_COPY[template.slug], `missing public copy: ${template.slug}`);
      assert.ok(CATALOG_DEMO_IDENTITIES[template.slug], `missing demo identity: ${template.slug}`);
    }
  });

  it("browse cards are unique, dash-free, and themed with distinct sample hosts", () => {
    const browse = getBrowseCatalogTemplates();
    const names = new Set<string>();
    const styles = new Set<string>();
    const hosts = new Set<string>();

    assert.ok(browse.length >= 15);

    for (const template of browse) {
      assert.equal(names.has(template.name), false, `duplicate name: ${template.name}`);
      names.add(template.name);

      assert.equal(styles.has(template.style), false, `duplicate style: ${template.style}`);
      styles.add(template.style);

      assert.equal(PUNCTUATION_DASH.test(template.name), false, template.name);
      assert.equal(PUNCTUATION_DASH.test(template.description), false, template.description);
      assert.equal(PUNCTUATION_DASH.test(template.style), false, template.style);

      const demo = getDemoContentForCategory(template.category, template.slug);
      assert.equal(hosts.has(demo.hostName), false, `duplicate host: ${demo.hostName}`);
      hosts.add(demo.hostName);

      assert.equal(catalogDemoLeaksClientIdentity(JSON.stringify(demo)), false);
      assert.equal(PUNCTUATION_DASH.test(demo.title), false, demo.title);
      assert.equal(PUNCTUATION_DASH.test(demo.message), false, demo.message);
    }
  });

  it("raw catalogue guest fields have no dashes either", () => {
    for (const template of CATALOG_TEMPLATES) {
      assert.equal(PUNCTUATION_DASH.test(template.name), false, template.name);
      assert.equal(PUNCTUATION_DASH.test(template.description), false, template.description);
      assert.equal(PUNCTUATION_DASH.test(template.style), false, `${template.slug} style ${template.style}`);
    }
  });

  it("funeral browse concepts never share style, mood, features, or experience DNA", () => {
    const funerals = getBrowseCatalogTemplates().filter((t) => t.category === "Funeral");
    assert.ok(funerals.length >= 5, `expected ≥5 funeral browse cards, got ${funerals.length}`);

    const dims: Array<[string, (t: (typeof funerals)[number]) => string]> = [
      ["style", (t) => t.style],
      ["mood", (t) => t.mood ?? ""],
      ["features", (t) => [...(t.features ?? [])].sort().join("|")],
      ["buttonStyle", (t) => t.buttonStyle ?? ""],
      ["intro", (t) => t.experienceOverrides?.introVariant ?? ""],
      ["opening", (t) => t.experienceOverrides?.openingExperience ?? ""],
      ["outro", (t) => t.experienceOverrides?.outroExperience ?? ""],
      ["transition", (t) => t.experienceOverrides?.sceneTransition ?? ""],
      ["slideshow", (t) => t.experienceOverrides?.slideshowStyle ?? ""],
      ["countdown", (t) => t.experienceOverrides?.countdownStyle ?? ""],
      ["typography", (t) => t.experienceOverrides?.typographyPackId ?? ""],
      ["concept", (t) => t.creativeBrief?.creativeConcept ?? ""],
    ];

    for (const [label, pick] of dims) {
      const seen = new Map<string, string>();
      for (const template of funerals) {
        const value = pick(template);
        assert.ok(value, `${template.slug} missing ${label}`);
        const prior = seen.get(value);
        assert.equal(
          prior,
          undefined,
          `funeral ${label} "${value}" shared by ${prior} and ${template.slug}`
        );
        seen.set(value, template.slug);
      }
    }
  });
});
