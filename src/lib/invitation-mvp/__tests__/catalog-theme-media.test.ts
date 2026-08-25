import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBrowseCatalogTemplates } from "../catalogue";
import { buildLivePreviewProps } from "../demo-preview-data";
import {
  FORBIDDEN_CATALOG_MEDIA_FRAGMENTS,
  getLayoutMediaPack,
} from "@/lib/invitation/layout-media-identity";
import { resolveInvitationMusic } from "@/lib/music/resolve-invitation-music";
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
      assert.match(pack.hero, /unsplash|\/templates\//);
    }
  });

  it("Onyx & Gold uses ring-box décor, not desk stock", () => {
    const preview = buildLivePreviewProps("luxury-rings", "Wedding", {
      catalogSlug: "luxury-rings",
    });
    assert.match(preview.event.coverImageUrl ?? "", /1605100804763/);
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
