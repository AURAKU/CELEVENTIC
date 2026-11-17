import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLivePreviewProps, DEMO_PREVIEW_GUEST_NAME } from "@/lib/invitation-mvp/demo-preview-data";
import { EXPERIENCE3_NATIVE_LAYOUT_SLUGS } from "@/lib/invitation/studio3/native-layouts";
import { resolveInvitationLayoutBranch } from "@/lib/invitation/studio3/experience-registry";
import { shouldUseLegacyInvitationRenderer } from "@/lib/invitation/layout-version";

describe("Experience 3.0 guest personalization + isolation smoke", () => {
  it("keeps demo guest identity only in preview props for all native layouts", () => {
    const categories = {
      "ix3-editorial-wedding": "Wedding",
      "ix3-brand-launch": "Corporate",
      "ix3-memorial": "Funeral",
    } as const;

    for (const layout of EXPERIENCE3_NATIVE_LAYOUT_SLUGS) {
      const preview = buildLivePreviewProps(layout, categories[layout]);
      assert.equal(preview.guestName, DEMO_PREVIEW_GUEST_NAME);
      assert.equal(preview.design.layout, layout);
      assert.ok(preview.event.title);
      assert.ok(preview.event.startDateRaw);
      // Preview must not look like a silent upgrade of a protected catalogue layout.
      assert.equal(shouldUseLegacyInvitationRenderer(preview.design), false);
      assert.equal(resolveInvitationLayoutBranch(preview.design).mode, "experience3-unregistered");
    }
  });

  it("does not route protected flagships through experience3 when unversioned", () => {
    for (const layout of [
      "forever-afaris-wedding",
      "seraphine-champagne-wedding",
      "luxury-fashion-flagship",
      "memorial-candle-tribute",
      "traditional-marriage-ceremony",
    ]) {
      assert.equal(shouldUseLegacyInvitationRenderer({ layout }), true);
      assert.equal(resolveInvitationLayoutBranch({ layout }).mode, "legacy");
    }
  });
});
