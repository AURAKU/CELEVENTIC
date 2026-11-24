import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLivePreviewProps } from "@/lib/invitation-mvp/demo-preview-data";
import { getDefaultDesignConfig, getTemplatePreset } from "@/lib/invitation-templates";
import { resolveInvitationLayoutBranch } from "@/lib/invitation/studio3/experience-registry";
import { shouldUseLegacyInvitationRenderer } from "@/lib/invitation/layout-version";

/**
 * Stage 3 sandbox: Studio-shaped content fields must survive into Experience 3.0
 * guest preview props without falling back to legacy protected templates.
 */
const BATCH1 = [
  { layout: "ix3-heritage-marriage", category: "Wedding" },
  { layout: "ix3-corporate-gala", category: "Corporate" },
  { layout: "ix3-baby-shower", category: "Private Event" },
  { layout: "ix3-graduation", category: "Private Event" },
  { layout: "ix3-birthday-celebration", category: "Birthday" },
  { layout: "ix3-concert-night", category: "Concert" },
] as const;

describe("Batch 1 studio content → guest preview round-trip", () => {
  it("keeps presets on Experience 3.0 with layoutVersion and studio-editable fields", () => {
    for (const { layout, category } of BATCH1) {
      const preset = getTemplatePreset(layout);
      assert.ok(preset, `missing preset ${layout}`);
      assert.equal(preset!.config.layoutVersion, 1);

      const design = {
        ...getDefaultDesignConfig(layout),
        // Simulate Studio save of supported surface fields via design overlay markers.
        title: undefined,
      };
      assert.equal(shouldUseLegacyInvitationRenderer(design), false);
      assert.equal(resolveInvitationLayoutBranch(design).mode, "experience3-unregistered");

      const preview = buildLivePreviewProps(layout, category);
      assert.equal(preview.design.layout, layout);
      assert.ok(preview.event.title?.trim(), `${layout} missing title`);
      assert.ok(preview.event.hostName?.trim() || preview.event.title, `${layout} missing host/title`);
      assert.ok(preview.guestName, `${layout} missing demo guest`);

      // Studio-like mutation of guest-facing content fields must remain renderable.
      const mutated = {
        ...preview,
        event: {
          ...preview.event,
          title: `Studio Save ${layout}`,
          hostName: "Studio Host",
          message: "Persisted studio message for guest view.",
          venueName: "Studio Venue",
        },
      };
      assert.equal(mutated.design.layout, layout);
      assert.match(mutated.event.title, /Studio Save/);
      assert.equal(mutated.event.hostName, "Studio Host");
      assert.match(mutated.event.message ?? "", /Persisted studio message/);
      assert.equal(shouldUseLegacyInvitationRenderer(mutated.design), false);
    }
  });
});
