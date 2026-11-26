import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDefaultDesignConfig, getTemplatePreset } from "@/lib/invitation-templates";
import { EXPERIENCE3_NATIVE_LAYOUT_SLUGS } from "@/lib/invitation/studio3/native-layouts";
import { resolveEventTheme } from "@/lib/invitation/theme-media-assets";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";

describe("Experience 3.0 presets + demo preview", () => {
  it("provides design presets for every native layout", () => {
    for (const layout of EXPERIENCE3_NATIVE_LAYOUT_SLUGS) {
      const preset = getTemplatePreset(layout);
      assert.ok(preset, `missing preset for ${layout}`);
      assert.equal(preset!.config.layout, layout);
      assert.equal(preset!.config.layoutVersion, 1);
      const defaults = getDefaultDesignConfig(layout);
      assert.equal(defaults.layout, layout);
    }
  });

  it("resolves category themes for native layouts", () => {
    assert.equal(resolveEventTheme("ix3-editorial-wedding"), "Wedding");
    assert.equal(resolveEventTheme("ix3-brand-launch"), "Corporate");
    assert.equal(resolveEventTheme("ix3-memorial"), "Funeral");
    assert.equal(resolveEventTheme("ix3-heritage-marriage"), "Wedding");
    assert.equal(resolveEventTheme("ix3-birthday-celebration"), "Birthday");
    assert.equal(resolveEventTheme("ix3-concert-night"), "Concert");
  });

  it("builds demo preview props with demo guest only", () => {
    const wedding = buildLivePreviewProps("ix3-editorial-wedding", "Wedding");
    assert.equal(wedding.design.layout, "ix3-editorial-wedding");
    assert.equal(wedding.guestName, "Alex Mensah");
    assert.ok(wedding.event.coverImageUrl);

    const memorial = buildLivePreviewProps("ix3-memorial", "Funeral");
    assert.equal(memorial.design.layout, "ix3-memorial");
    assert.ok(memorial.event.deceasedName);
  });
});
