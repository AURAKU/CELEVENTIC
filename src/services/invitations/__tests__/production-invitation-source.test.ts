import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveLiveRevealConfiguration } from "@/lib/experience/live-envelope-contract";
import {
  rankLiveProductionOrders,
  resolveProductionOrderForLiveInvitationWithReader,
  type ProductionInvitationOrder,
} from "../production-invitation-source.service";

const STUDIO_LAYOUT = "traditional-marriage-ceremony";
const MEMORIAL_LAYOUT = "memorial-candle-tribute";

function productionOrder(
  overrides: Partial<ProductionInvitationOrder> & { invitationId?: string | null } = {}
): ProductionInvitationOrder {
  return {
    id: overrides.id ?? "order-1",
    invitationId: overrides.invitationId ?? "canonical-invitation",
    eventId: overrides.eventId ?? "event-1",
    templateSlug: overrides.templateSlug ?? STUDIO_LAYOUT,
    status: overrides.status ?? "PAID",
    productionStatus: overrides.productionStatus ?? "DELIVERED",
    workflowStage: overrides.workflowStage ?? "ADDONS_SELECTED",
    eventType: overrides.eventType ?? "WEDDING",
    shareUrl: overrides.shareUrl ?? null,
    updatedAt: overrides.updatedAt ?? new Date("2026-08-25T12:00:00Z"),
    designConfig: overrides.designConfig ?? {
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
      slug: overrides.templateSlug ?? STUDIO_LAYOUT,
      defaultMusicTrack: null,
    },
    languageVersions: [],
  } as unknown as ProductionInvitationOrder;
}

function readerReturning(
  results: {
    direct?: ProductionInvitationOrder | null;
    legacyDirect?: ProductionInvitationOrder | null;
    eventMany?: ProductionInvitationOrder[];
  },
  calls: unknown[]
) {
  return {
    invitationOrder: {
      async findFirst(args: unknown) {
        calls.push(args);
        const where = (args as { where?: { invitationId?: string; status?: unknown } }).where;
        if (where?.invitationId && where?.status) {
          return results.direct ?? null;
        }
        if (where?.invitationId) {
          return results.legacyDirect ?? null;
        }
        return null;
      },
      async findMany(args: unknown) {
        calls.push(args);
        const eventId = (args as { where?: { eventId?: string } }).where?.eventId;
        return (results.eventMany ?? []).filter((order) => order.eventId === eventId);
      },
    },
  };
}

/** Production DB shape — detached RSVP/quick-invite invitation on a funeral event. */
const PRODUCTION_EVENT_ID = "cmt4re7wq022elad67v0vdqxx";
const PRODUCTION_DETACHED_INVITATION_ID = "cmt92f74200hilazf1lofhpr6";
const PRODUCTION_CANONICAL_INVITATION_ID = "cmt4re7wv022hlad6bky1kyjf";
const PRODUCTION_ORDER_ID = "cmt4qlrsg00lmlad6xkkof8yo";

function productionFuneralOrder(): ProductionInvitationOrder {
  return productionOrder({
    id: PRODUCTION_ORDER_ID,
    invitationId: PRODUCTION_CANONICAL_INVITATION_ID,
    eventId: PRODUCTION_EVENT_ID,
    eventType: "FUNERAL",
    templateSlug: "one-week-vigil-notice",
    status: "PAID",
    productionStatus: "DELIVERED",
    workflowStage: "ADDONS_SELECTED",
    shareUrl: null,
    designConfig: {
      layout: MEMORIAL_LAYOUT,
      studio: { revealMode: "curtain" },
      experience: {
        collectionId: "funeral",
        openingExperience: "envelope-classic",
      },
      colors: {
        primary: "#FAF8F4",
        secondary: "#D4A63A",
        accent: "#7F1D1D",
        background: "#0C0A09",
        text: "#E7E5E4",
      },
    },
  });
}

describe("production invitation source", () => {
  it("inherits the event's live Studio design for a secondary guest invite", async () => {
    const calls: unknown[] = [];
    const source = productionOrder();
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "secondary-guest-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [source] }, calls)
    );

    assert.equal(resolved.order?.id, source.id);
    assert.equal(resolved.method, "event-live-production-order");
    assert.equal(buildPublishedDesignConfig(resolved.order!).layout, STUDIO_LAYOUT);
  });

  it("inherits from a PAID Studio order before formal PUBLISHED status", async () => {
    const paid = productionOrder({ status: "PAID", shareUrl: null });
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "secondary-guest-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [paid] }, [])
    );

    assert.equal(resolved.order?.id, paid.id);
    assert.equal(buildPublishedDesignConfig(resolved.order!).layout, STUDIO_LAYOUT);
  });

  it("keeps the canonical invitation on its direct production order", async () => {
    const calls: unknown[] = [];
    const source = productionOrder();
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "canonical-invitation",
      "event-1",
      readerReturning({ direct: source }, calls)
    );

    assert.equal(resolved.order?.invitationId, "canonical-invitation");
    assert.equal(resolved.method, "direct-invitation-match");
    assert.equal(calls.length, 1, "a direct match must not query the event fallback");
  });

  it("PRODUCTION FIXTURE: detached invitation inherits canonical funeral production order", async () => {
    const source = productionFuneralOrder();
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      PRODUCTION_DETACHED_INVITATION_ID,
      PRODUCTION_EVENT_ID,
      readerReturning({ direct: null, legacyDirect: null, eventMany: [source] }, [])
    );

    assert.equal(resolved.method, "event-live-production-order");
    assert.equal(resolved.order?.id, PRODUCTION_ORDER_ID);
    assert.equal(resolved.order?.templateSlug, "one-week-vigil-notice");

    const design = buildPublishedDesignConfig(resolved.order!);
    assert.equal(design.layout, MEMORIAL_LAYOUT);
    assert.equal(design.studio?.revealMode, "curtain");
    assert.equal(design.experience?.collectionId, "funeral");
    assert.equal(design.experience?.openingExperience, "envelope-classic");

    const liveReveal = resolveLiveRevealConfiguration({
      catalogSlug: resolved.order!.templateSlug,
      layout: design.layout,
      studio: design.studio,
      experience: design.experience,
    });

    assert.equal(liveReveal.mandatoryMemorialEnvelope, true);
    assert.equal(liveReveal.showReveal, true);
    assert.equal(liveReveal.resolvedRevealMode, "envelope");
    assert.equal(liveReveal.resolvedOpeningExperience, "wax-seal-black");
    assert.equal(liveReveal.curtainOwnsTap, false);
  });

  it("selects the best published order when multiple historical event orders exist", async () => {
    const draft = productionOrder({
      id: "draft-order",
      status: "PAID",
      productionStatus: "DESIGNING",
      updatedAt: new Date("2026-08-26T12:00:00Z"),
    });
    const delivered = productionOrder({
      id: "delivered-order",
      status: "PAID",
      productionStatus: "DELIVERED",
      updatedAt: new Date("2026-08-20T12:00:00Z"),
    });
    const ranked = rankLiveProductionOrders([draft, delivered]);
    assert.equal(ranked[0]?.id, "delivered-order");

    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "detached-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [draft, delivered] }, [])
    );
    assert.equal(resolved.order?.id, "delivered-order");
  });

  it("does not attach unrelated event orders", async () => {
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "detached-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [] }, [])
    );
    assert.equal(resolved.method, "none");
    assert.equal(resolved.order, null);
  });

  it("never selects NOT_STARTED production orders for event inheritance", async () => {
    const calls: unknown[] = [];
    const notStarted = productionOrder({
      id: "not-started",
      productionStatus: "NOT_STARTED",
    });
    await resolveProductionOrderForLiveInvitationWithReader(
      "detached-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [notStarted] }, calls)
    );

    const eventManyCall = calls.find(
      (call) => (call as { take?: number }).take === 12
    ) as { where?: { productionStatus?: unknown } } | undefined;
    assert.ok(eventManyCall);
    assert.deepEqual(eventManyCall?.where?.productionStatus, { not: "NOT_STARTED" });
  });

  it("event fallback no longer requires shareUrl (production order may be PAID + DELIVERED)", async () => {
    const calls: unknown[] = [];
    const source = productionOrder({ shareUrl: null, status: "PAID", productionStatus: "DELIVERED" });
    await resolveProductionOrderForLiveInvitationWithReader(
      "detached-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [source] }, calls)
    );

    const eventQuery = calls.find(
      (call) => (call as { where?: { eventId?: string } }).where?.eventId === "event-1"
    ) as { where?: Record<string, unknown> } | undefined;
    assert.ok(eventQuery);
    assert.equal(eventQuery?.where?.shareUrl, undefined);
  });

  it("carries the inherited Studio design into Event Companion", async () => {
    const source = productionOrder();
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "secondary-guest-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [source] }, [])
    );
    const inheritedDesign = buildPublishedDesignConfig(resolved.order!);
    const theme = resolveCompanionTheme({
      designConfig: inheritedDesign,
      template: {
        slug: resolved.order!.templateSlug,
        config: null,
      },
      eventCoverImageUrl: null,
    });

    assert.equal(theme.layout, STUDIO_LAYOUT);
    assert.equal(theme.colors.primary, "#102030");
  });

  it("wins over a catalogue layout stamped onto a secondary invitation", async () => {
    const source = productionOrder();
    const resolved = await resolveProductionOrderForLiveInvitationWithReader(
      "secondary-guest-invitation",
      "event-1",
      readerReturning({ direct: null, legacyDirect: null, eventMany: [source] }, [])
    );
    assert.ok(resolved.order);

    const live = buildPublishedDesignConfig(resolved.order);
    assert.equal(live.layout, STUDIO_LAYOUT);
    assert.notEqual(live.layout, "classic-gold");
  });
});

describe("one-week-vigil-notice reveal resolution", () => {
  it("normalizes stale curtain + envelope-classic to wax-seal-black envelope", () => {
    const liveReveal = resolveLiveRevealConfiguration({
      catalogSlug: "one-week-vigil-notice",
      layout: MEMORIAL_LAYOUT,
      studio: { revealMode: "curtain" },
      experience: {
        collectionId: "funeral",
        openingExperience: "envelope-classic",
      },
    });

    assert.equal(liveReveal.mandatoryMemorialEnvelope, true);
    assert.equal(liveReveal.showReveal, true);
    assert.equal(liveReveal.resolvedRevealMode, "envelope");
    assert.equal(liveReveal.resolvedOpeningExperience, "wax-seal-black");
    assert.equal(liveReveal.curtainOwnsTap, false);
  });
});
