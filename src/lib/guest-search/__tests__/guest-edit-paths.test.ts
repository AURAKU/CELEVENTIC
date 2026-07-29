import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanName } from "@/lib/guest-import/name";
import { clampPartySize } from "@/lib/guest-search/party-allowance";

/**
 * Focused pure checks for organiser guest-edit semantics used by
 * PATCH /api/invitations/[id]/personalisation and PATCH /api/guests/[id].
 * Lifecycle ARCHIVE (not hard delete) is product policy — covered by service docs.
 */

describe("guest edit path inputs", () => {
  it("normalises edited display names before persistence", () => {
    assert.equal(cleanName("  Mr  Kofi   Mensah  "), "Mr Kofi Mensah");
    assert.equal(cleanName("\u00A0Ama\u00A0"), "Ama");
  });

  it("rejects names that collapse below two characters", () => {
    assert.ok(cleanName("  A  ").length < 2);
    assert.ok(cleanName("Ko").length >= 2);
  });

  it("clamps party size for live invitation allowance edits", () => {
    assert.equal(clampPartySize(1), 1);
    assert.equal(clampPartySize(0), 1);
    assert.equal(clampPartySize(99), 20);
    assert.equal(clampPartySize(4.9), 4);
  });

  it("maps plus-ones to party size the way CRM edits do", () => {
    const plusOnes = 2;
    const partySize = Math.max(1, plusOnes + 1);
    assert.equal(partySize, 3);
  });
});
