import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBrowseCatalogTemplates } from "../catalogue";
import { buildLivePreviewProps } from "../demo-preview-data";
import {
  FORBIDDEN_CATALOG_MEDIA_FRAGMENTS,
  getLayoutMediaPack,
} from "@/lib/invitation/layout-media-identity";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
import { canonicalBundledMusicFile } from "@/lib/invitation/catalog-music-identity";
import { getDefaultDesignConfig } from "@/lib/invitation-templates";
import { enrichDesignWithExperienceDNA } from "@/lib/experience/experience-engine-v2";

describe("catalogue theme-matched media", () => {
  it("browse previews never use forbidden office/people stock", () => {
    for (const template of getBrowseCatalogTemplates()) {
      const preview = buildLivePreviewProps(template.layoutSlug, template.category, {
        catalogSlug: template.slug,
        features: template.features,
      });
      const urls = [
        preview.event.coverImageUrl,
        ...(preview.galleryUrls ?? []),
        JSON.stringify(preview.design),
      ].join("\n");

      for (const bad of FORBIDDEN_CATALOG_MEDIA_FRAGMENTS) {
        assert.equal(
          urls.includes(bad),
          false,
          `${template.slug} still references forbidden media ${bad}`
        );
      }

      const pack = getLayoutMediaPack(template.layoutSlug, template.slug);
      assert.ok(pack, `missing media pack for ${template.slug}`);
      assert.match(pack.hero, /unsplash|\/templates\/|\/demo-media\//);
    }
  });

  it("browse templates never share a hero still", () => {
    const heroes = new Map<string, string>();
    for (const template of getBrowseCatalogTemplates()) {
      const pack = getLayoutMediaPack(template.layoutSlug, template.slug);
      assert.ok(pack?.hero, `missing hero for ${template.slug}`);
      const prior = heroes.get(pack.hero);
      assert.equal(prior, undefined, `hero ${pack.hero} shared by ${prior} and ${template.slug}`);
      heroes.set(pack.hero, template.slug);
    }
  });

  it("Onyx & Gold uses a unique ring-box still, not desk stock", () => {
    const preview = buildLivePreviewProps("luxury-rings", "Wedding", {
      catalogSlug: "luxury-rings",
    });
    assert.match(preview.event.coverImageUrl ?? "", /demo-media\/luxury-rings\/hero/);
    assert.equal((preview.event.coverImageUrl ?? "").includes("1454165804606"), false);
  });

  it("each browse template resolves themed DNA music", () => {
    for (const template of getBrowseCatalogTemplates()) {
      const design = enrichDesignWithExperienceDNA(
        getDefaultDesignConfig(template.slug) ?? getDefaultDesignConfig(template.layoutSlug)
      );
      const music = resolveInvitationMusic({ design, catalogSlug: template.slug }).musicSelection;
      assert.ok(music?.url, `missing music for ${template.slug}`);
      assert.ok(music?.title, `missing music title for ${template.slug}`);
    }
  });

  it("browse templates never share the same music recording window", () => {
    const windows: Array<{ slug: string; key: string; start: number; end: number }> = [];
    for (const template of getBrowseCatalogTemplates()) {
      const design = enrichDesignWithExperienceDNA(
        getDefaultDesignConfig(template.slug) ?? getDefaultDesignConfig(template.layoutSlug)
      );
      const music = resolveInvitationMusic({ design, catalogSlug: template.slug }).musicSelection;
      assert.ok(music?.url, `missing music for ${template.slug}`);
      const canon = music.url.includes("/templates/")
        ? music.url
        : canonicalBundledMusicFile(music.url);
      const start = music.startSec ?? 0;
      const end = music.endSec ?? start + 60;
      for (const prior of windows) {
        if (prior.key !== canon) continue;
        const overlaps = start < prior.end && end > prior.start;
        assert.equal(
          overlaps,
          false,
          `music ${canon} overlaps for ${prior.slug} (${prior.start}-${prior.end}) and ${template.slug} (${start}-${end})`
        );
      }
      windows.push({ slug: template.slug, key: canon, start, end });
    }
  });

  it("birthday browse templates never share a music file", () => {
    const birthdays = getBrowseCatalogTemplates().filter((t) => t.category === "Birthday");
    assert.ok(birthdays.length >= 5, "expected at least 5 birthday browse templates");
    const files = new Map<string, string>();
    for (const template of birthdays) {
      const design = enrichDesignWithExperienceDNA(
        getDefaultDesignConfig(template.slug) ?? getDefaultDesignConfig(template.layoutSlug)
      );
      const music = resolveInvitationMusic({ design, catalogSlug: template.slug }).musicSelection;
      assert.ok(music?.url, `missing music for ${template.slug}`);
      const file = (music.url.match(/\/music\/([^/?#]+)/)?.[1] ?? music.url).toLowerCase();
      const prior = files.get(file);
      assert.equal(
        prior,
        undefined,
        `birthday music file ${file} shared by ${prior} and ${template.slug}`
      );
      files.set(file, template.slug);
    }
  });
});
