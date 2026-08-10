import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractInvitationHashtag,
  normalizeGiftBrandHashtag,
  resolveGiftStatusBrandSegment,
} from "@/lib/gifts/gift-brand-label";
import type { InvitationDesignConfig } from "@/types/invitation-design";

describe("normalizeGiftBrandHashtag", () => {
  it("strips hash and separators then uppercases", () => {
    assert.equal(normalizeGiftBrandHashtag("#TheForeverAfaris"), "THEFOREVERAFARIS");
    assert.equal(normalizeGiftBrandHashtag("#THE FOREVER AFARIS"), "THEFOREVERAFARIS");
    assert.equal(normalizeGiftBrandHashtag("  the-forever_afaris  "), "THEFOREVERAFARIS");
  });
});

describe("resolveGiftStatusBrandSegment", () => {
  it("prefers thank-you eventHashtag over title", () => {
    assert.equal(
      resolveGiftStatusBrandSegment({
        eventTitle: "The Wedding",
        eventHashtag: "#TheForeverAfaris",
      }),
      "THEFOREVERAFARIS"
    );
  });

  it("uses invitation hashtag when thank-you hashtag is absent", () => {
    assert.equal(
      resolveGiftStatusBrandSegment({
        eventTitle: "The Wedding",
        invitationHashtag: "#OurBigDay",
      }),
      "OURBIGDAY"
    );
  });

  it("uses Forever Afaris template constant when title is generic", () => {
    assert.equal(
      resolveGiftStatusBrandSegment({
        eventTitle: "The Wedding",
        templateSlug: "forever-afaris-wedding",
      }),
      "THEFOREVERAFARIS"
    );
  });

  it("uses forever-afaris slug when template is unknown", () => {
    assert.equal(
      resolveGiftStatusBrandSegment({
        eventTitle: "The Wedding",
        eventSlug: "forever-afaris",
      }),
      "THEFOREVERAFARIS"
    );
  });

  it("falls back to event title for unrelated events", () => {
    assert.equal(
      resolveGiftStatusBrandSegment({
        eventTitle: "Ama's Birthday",
        templateSlug: "floral-garden",
        eventSlug: "amas-birthday-2026",
      }),
      "Ama's Birthday"
    );
  });

  it("does not invent Forever Afaris from missing invitation alone", () => {
    assert.equal(
      resolveGiftStatusBrandSegment({
        eventTitle: "The Wedding",
      }),
      "The Wedding"
    );
  });
});

describe("extractInvitationHashtag", () => {
  it("reads studio weddingBoard hashtag when present", () => {
    const design = {
      studio: { weddingBoard: { hashtag: "#CustomTag" } },
    } as InvitationDesignConfig;
    assert.equal(extractInvitationHashtag(design), "#CustomTag");
  });

  it("returns null when hashtag is absent", () => {
    assert.equal(extractInvitationHashtag(null), null);
    assert.equal(extractInvitationHashtag({} as InvitationDesignConfig), null);
  });
});
