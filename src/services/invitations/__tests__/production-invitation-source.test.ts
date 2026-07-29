import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import {
  resolveProductionInvitationOrderWithReader,
  type ProductionInvitationOrder,
} from "../production-invitation-source.service";

const STUDIO_LAYOUT = "traditional-marriage-ceremony";

function productionOrder(
  invitationId = "canonical-invitation"
): ProductionInvitationOrder {
  return {
    id: "order-1",
    invitationId,
    eventId: "event-1",
    templateSlug: STUDIO_LAYOUT,
    designConfig: {
      layout: STUDIO_LAYOUT,
      colors: {
        primary: "#102030",
        secondary: "#d4af37",
        accent: "#be123c",
        background: "#fffaf0",
        text: "#111827",
      },
    },
    galleryUrls: [],
    template: {
      slug: STUDIO_LAYOUT,
      defaultMusicTrack: null,
    },
    languageVersions: [],
  } as unknown as ProductionInvitationOrder;
}

function readerReturning(
  results: Array<ProductionInvitationOrder | null>,
  calls: unknown[]
) {
  return {
    invitationOrder: {
      async findFirst(args: unknown) {
        calls.push(args);
        return results.shift() ?? null;
      },
    },
  };
}

describe("production invitation source", () => {
  it("inherits the event's published Studio design for a secondary guest invite", async () => {
    const calls: unknown[] = [];
    const source = productionOrder();
    const resolved = await resolveProductionInvitationOrderWithReader(
      "secondary-guest-invitation",
      "event-1",
      readerReturning([null, source], calls)
    );

    assert.equal(resolved?.id, source.id);
    assert.equal(calls.length, 2);
    assert.deepEqual((calls[1] as { where: unknown }).where, {
      eventId: "event-1",
      status: "PUBLISHED",
      invitationId: { not: null },
      shareUrl: { not: null },
      archivedAt: null,
    });

    const design = buildPublishedDesignConfig(resolved!);
    assert.equal(design.layout, STUDIO_LAYOUT);
    assert.notEqual(design.layout, "classic-gold");
  });

  it("keeps the canonical invitation on its direct production order", async () => {
    const calls: unknown[] = [];
    const source = productionOrder();
    const resolved = await resolveProductionInvitationOrderWithReader(
      "canonical-invitation",
      "event-1",
      readerReturning([source], calls)
    );

    assert.equal(resolved?.invitationId, "canonical-invitation");
    assert.equal(calls.length, 1, "a direct match must not query the event fallback");
    assert.equal(buildPublishedDesignConfig(resolved!).layout, STUDIO_LAYOUT);
  });

  it("carries the inherited Studio design into Event Companion", async () => {
    const source = productionOrder();
    const resolved = await resolveProductionInvitationOrderWithReader(
      "secondary-guest-invitation",
      "event-1",
      readerReturning([null, source], [])
    );
    const inheritedDesign = buildPublishedDesignConfig(resolved!);
    const theme = resolveCompanionTheme({
      designConfig: inheritedDesign,
      template: {
        slug: resolved!.templateSlug,
        config: null,
      },
      eventCoverImageUrl: null,
    });

    assert.equal(theme.layout, STUDIO_LAYOUT);
    assert.equal(theme.colors.primary, "#102030");
    assert.notEqual(theme.layout, "classic-gold");
  });
});
