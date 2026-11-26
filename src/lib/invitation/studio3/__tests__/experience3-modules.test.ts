import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLivePreviewProps, DEMO_PREVIEW_GUEST_NAME } from "@/lib/invitation-mvp/demo-preview-data";
import { EXPERIENCE3_NATIVE_LAYOUT_SLUGS } from "@/lib/invitation/studio3/native-layouts";
import { resolveInvitationLayoutBranch } from "@/lib/invitation/studio3/experience-registry";
import { shouldUseLegacyInvitationRenderer } from "@/lib/invitation/layout-version";

describe("Experience 3.0 guest personalization + isolation smoke", () => {
  it("keeps demo guest identity only in preview props for all native layouts", () => {
    const categories: Record<string, string> = {
      "ix3-editorial-wedding": "Wedding",
      "ix3-brand-launch": "Corporate",
      "ix3-memorial": "Funeral",
      "ix3-heritage-marriage": "Wedding",
      "ix3-birthday-celebration": "Birthday",
      "ix3-corporate-gala": "Corporate",
      "ix3-concert-night": "Concert",
      "ix3-graduation": "Private Event",
      "ix3-baby-shower": "Private Event",
    };

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
    const protectedLayouts = [
      "forever-afaris-wedding",
      "seraphine-champagne-wedding",
      "luxury-fashion-flagship",
      "memorial-candle-tribute",
      "traditional-marriage-ceremony",
    ] as const;
    for (const layout of protectedLayouts) {
      assert.equal(shouldUseLegacyInvitationRenderer({ layout }), true);
      assert.equal(resolveInvitationLayoutBranch({ layout }).mode, "legacy");
    }
  });
});
