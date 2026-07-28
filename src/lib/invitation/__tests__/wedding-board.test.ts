/**
 * The Forever Afaris wedding board — content + ceremony guarantees.
 * Run: npm run test:live-editability
 *
 * These lock in the contract the luxury wedding template depends on: the
 * mandated copy ships as the default, every host edit survives the merge, and
 * the scene order can be rearranged without a scene ever going missing.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_WEDDING_BOARD,
  WEDDING_SECTION_ORDER,
  distinctInvitationPhrase,
  invitationPhrasesMatch,
  mergeWeddingBoard,
  normaliseSectionOrder,
  type WeddingSectionId,
} from "../wedding-board";
import {
  resolveSealWax,
  resolveWeddingPalette,
  FA_PALETTE,
} from "../../../components/invitation/templates/forever-afaris-wedding-palette";

describe("wedding board defaults", () => {
  it("ships the mandated Afari × Opoku invitation copy", () => {
    assert.equal(DEFAULT_WEDDING_BOARD.coupleName1, "JEFFERY OWURAKU AFARI");
    assert.equal(DEFAULT_WEDDING_BOARD.coupleName2, "FRANCISCA CHELSY SERWAAH OPOKU");
    assert.equal(DEFAULT_WEDDING_BOARD.hashtag, "#TheForeverAfaris");
    assert.equal(DEFAULT_WEDDING_BOARD.venueName, "SUBTLE CLASS EVENT CENTRE, OGBOJO.");
    assert.equal(DEFAULT_WEDDING_BOARD.displayDate, "AUGUST • 15 • 2026");
    assert.equal(DEFAULT_WEDDING_BOARD.timeLabel, "2:00 PM");
    assert.equal(DEFAULT_WEDDING_BOARD.accessNote, "STRICTLY BY INVITATION");
    assert.equal(DEFAULT_WEDDING_BOARD.rsvpContacts.length, 2);
    assert.ok(DEFAULT_WEDDING_BOARD.rsvpContacts.every((c) => c.phone.startsWith("+233")));
  });

  it("describes a complete opening ceremony with no uploads required", () => {
    assert.ok(DEFAULT_WEDDING_BOARD.sealMonogram);
    assert.ok(DEFAULT_WEDDING_BOARD.openingInstruction);
    assert.ok(DEFAULT_WEDDING_BOARD.gateWord);
    assert.equal(DEFAULT_WEDDING_BOARD.envelopeStyle, "blush-floral");
    assert.equal(DEFAULT_WEDDING_BOARD.gateStyle, "golden-baroque");
    assert.equal(DEFAULT_WEDDING_BOARD.sealColor, "champagne");
  });
});

describe("mergeWeddingBoard", () => {
  it("keeps every host edit over the premium default", () => {
    const merged = mergeWeddingBoard({
      coupleName1: "ADWOA",
      gateWord: "Always",
      sealColor: "emerald",
      accentColor: "#123456",
    });
    assert.equal(merged.coupleName1, "ADWOA");
    assert.equal(merged.gateWord, "Always");
    assert.equal(merged.sealColor, "emerald");
    assert.equal(merged.accentColor, "#123456");
    // untouched fields still fall back to the designed copy
    assert.equal(merged.coupleName2, DEFAULT_WEDDING_BOARD.coupleName2);
  });

  it("falls back to the default lists rather than rendering empty sections", () => {
    const merged = mergeWeddingBoard({ rsvpContacts: [], programmeItems: [] });
    assert.equal(merged.rsvpContacts.length, DEFAULT_WEDDING_BOARD.rsvpContacts.length);
    assert.equal(merged.programmeItems.length, DEFAULT_WEDDING_BOARD.programmeItems.length);
  });

  it("merges feature flags so a new scene defaults on without wiping host choices", () => {
    const merged = mergeWeddingBoard({ features: { countdown: false } });
    assert.equal(merged.features.countdown, false);
    assert.equal(merged.features.rsvp, true);
    assert.equal(merged.features.closing, true);
  });

  it("treats an absent board as the full default ceremony", () => {
    assert.deepEqual(mergeWeddingBoard(undefined), mergeWeddingBoard(null));
    assert.equal(mergeWeddingBoard(undefined).hashtag, DEFAULT_WEDDING_BOARD.hashtag);
  });

  it("never repeats the hero eyebrow as the family section heading", () => {
    assert.equal(DEFAULT_WEDDING_BOARD.familyHeading, "");
    assert.equal(mergeWeddingBoard(undefined).familyHeading, "");
    assert.equal(
      mergeWeddingBoard({
        familyHeading: "Together With Their Families",
        eyebrow: "TOGETHER WITH THEIR FAMILIES",
      }).familyHeading,
      ""
    );
    assert.equal(
      mergeWeddingBoard({
        familyHeading: "Our families welcome you",
        eyebrow: "TOGETHER WITH THEIR FAMILIES",
      }).familyHeading,
      "Our families welcome you"
    );
  });
});

describe("invitation phrase dedupe", () => {
  it("matches phrases ignoring case, spacing, and punctuation", () => {
    assert.equal(
      invitationPhrasesMatch("TOGETHER WITH THEIR FAMILIES", "Together With Their Families"),
      true
    );
    assert.equal(invitationPhrasesMatch("Together  with  their families!", "together with their families"), true);
    assert.equal(invitationPhrasesMatch("The Wedding", "TOGETHER WITH THEIR FAMILIES"), false);
    assert.equal(distinctInvitationPhrase("Together With Their Families", "TOGETHER WITH THEIR FAMILIES"), "");
    assert.equal(distinctInvitationPhrase("Welcome", "TOGETHER WITH THEIR FAMILIES"), "Welcome");
  });
});

describe("scene order", () => {
  it("defaults to the designed ceremony flow", () => {
    assert.deepEqual(normaliseSectionOrder(), WEDDING_SECTION_ORDER);
    assert.equal(WEDDING_SECTION_ORDER[0], "hero");
    assert.equal(WEDDING_SECTION_ORDER[WEDDING_SECTION_ORDER.length - 1], "closing");
  });

  it("honours the host's order and still renders every remaining scene", () => {
    const order = normaliseSectionOrder(["rsvp", "hero"]);
    assert.equal(order[0], "rsvp");
    assert.equal(order[1], "hero");
    assert.equal(order.length, WEDDING_SECTION_ORDER.length);
    assert.equal(new Set(order).size, WEDDING_SECTION_ORDER.length);
  });

  it("drops unknown or duplicated ids instead of rendering a blank scene", () => {
    const order = normaliseSectionOrder([
      "hero",
      "hero",
      "not-a-scene" as WeddingSectionId,
      "closing",
    ]);
    assert.deepEqual(order.slice(0, 2), ["hero", "closing"]);
    assert.equal(order.length, WEDDING_SECTION_ORDER.length);
    assert.ok(!order.includes("not-a-scene" as WeddingSectionId));
  });
});

describe("palette", () => {
  it("returns the designed palette when the host has chosen no colours", () => {
    assert.deepEqual(resolveWeddingPalette(), { ...FA_PALETTE });
    assert.deepEqual(resolveWeddingPalette({ accentColor: "  " }), { ...FA_PALETTE });
  });

  it("cascades an accent choice into its deep and soft companions", () => {
    const palette = resolveWeddingPalette({ accentColor: "#808080" });
    assert.equal(palette.gold, "#808080");
    assert.notEqual(palette.goldDeep, FA_PALETTE.goldDeep);
    assert.notEqual(palette.goldSoft, FA_PALETTE.goldSoft);
    // deep is darker than soft on every channel
    assert.ok(parseInt(palette.goldDeep.slice(1), 16) < parseInt(palette.goldSoft.slice(1), 16));
  });

  it("ignores values that are not hex colours", () => {
    const palette = resolveWeddingPalette({ inkColor: "red", blushColor: "#GGGGGG" });
    assert.equal(palette.ink, FA_PALETTE.ink);
    assert.equal(palette.blush, FA_PALETTE.blush);
  });

  it("resolves every offered wax colour and falls back to champagne", () => {
    for (const id of ["champagne", "rose-gold", "blush", "ivory", "emerald", "burgundy"]) {
      assert.ok(resolveSealWax(id).base.startsWith("#"), `${id} has no wax`);
    }
    assert.equal(resolveSealWax("nope").label, resolveSealWax("champagne").label);
    assert.equal(resolveSealWax(null).label, resolveSealWax("champagne").label);
  });
});
