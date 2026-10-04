import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSocialGuestGreeting,
  parseAssignedGuestGreeting,
  resolveSocialInvitationGuest,
  sanitizeSocialGuestDisplayName,
} from "../social-guest";

describe("sanitizeSocialGuestDisplayName", () => {
  it("keeps stored guest-facing names without inventing titles", () => {
    assert.equal(sanitizeSocialGuestDisplayName("  Ama  "), "Ama");
    assert.equal(sanitizeSocialGuestDisplayName("Esther Mensah"), "Esther Mensah");
    assert.equal(sanitizeSocialGuestDisplayName("Mr. & Mrs. Mensah"), "Mr. & Mrs. Mensah");
    assert.equal(sanitizeSocialGuestDisplayName("The Boateng Family"), "The Boateng Family");
  });

  it("rejects emails, phones, tokens, and internal IDs", () => {
    assert.equal(sanitizeSocialGuestDisplayName("ama@example.com"), null);
    assert.equal(sanitizeSocialGuestDisplayName("0246502998"), null);
    assert.equal(sanitizeSocialGuestDisplayName("+233246502998"), null);
    assert.equal(sanitizeSocialGuestDisplayName("clxyzabcdefghijklmnopqrstu"), null);
    assert.equal(sanitizeSocialGuestDisplayName("guest_abc123"), null);
    assert.equal(sanitizeSocialGuestDisplayName("550e8400-e29b-41d4-a716-446655440000"), null);
    assert.equal(sanitizeSocialGuestDisplayName(""), null);
    assert.equal(sanitizeSocialGuestDisplayName("   "), null);
  });
});

describe("resolveSocialInvitationGuest", () => {
  it("personalizes from a valid guest token on an Aurelia invitation", () => {
    const resolved = resolveSocialInvitationGuest({
      guestToken: "ama-token",
      tokenGuest: { name: "Ama", qrToken: "ama-token" },
      invitationName: "AURELIA",
      eventTitle: "AURELIA",
      guests: [
        { name: "Ama", qrToken: "ama-token" },
        { name: "Kofi", qrToken: "kofi-token" },
      ],
    });
    assert.equal(resolved?.displayName, "Ama");
    assert.equal(resolved?.guestToken, "ama-token");
    assert.equal(formatSocialGuestGreeting(resolved?.displayName), "Dear Ama,");
  });

  it("personalizes from a valid guest token on a Seraphine invitation", () => {
    const resolved = resolveSocialInvitationGuest({
      guestToken: "esther-token",
      tokenGuest: { name: "Esther", qrToken: "esther-token" },
      invitationName: "Kojo & Fafa Seraphine",
      eventTitle: "Seraphine Champagne",
      guests: [{ name: "Esther", qrToken: "esther-token" }],
    });
    assert.equal(resolved?.displayName, "Esther");
    assert.equal(resolved?.guestToken, "esther-token");
  });

  it("does not invent a guest on a generic Aurelia / open-host invitation", () => {
    const resolved = resolveSocialInvitationGuest({
      invitationName: "AURELIA",
      eventTitle: "AURELIA",
      guests: [
        { name: "Ama", qrToken: "ama-token" },
        { name: "Kofi", qrToken: "kofi-token" },
      ],
    });
    assert.equal(resolved, null);
  });

  it("does not invent a guest on a generic Seraphine / open-host invitation", () => {
    const resolved = resolveSocialInvitationGuest({
      invitationName: "Seraphine Champagne",
      eventTitle: "Seraphine Champagne",
      guests: [{ name: "Esther", qrToken: "esther-token" }],
    });
    assert.equal(resolved, null);
  });

  it("does not reveal a guest for an invalid token", () => {
    const resolved = resolveSocialInvitationGuest({
      guestToken: "missing-token",
      tokenGuest: null,
      invitationName: "Ama",
      eventTitle: "AURELIA",
      guests: [{ name: "Ama", qrToken: "ama-token" }],
    });
    assert.equal(resolved, null);
  });

  it("does not resolve a guest that belongs to another invitation", () => {
    const resolved = resolveSocialInvitationGuest({
      guestToken: "foreign-token",
      tokenGuest: null,
      invitationName: "Kojo & Fafa",
      eventTitle: "Kojo & Fafa",
      guests: [{ name: "Esther", qrToken: "esther-token" }],
    });
    assert.equal(resolved, null);
  });

  it("does not surface an archived guest", () => {
    const resolved = resolveSocialInvitationGuest({
      guestToken: "ama-token",
      tokenGuest: { name: "Ama", qrToken: "ama-token", archivedAt: new Date().toISOString() },
      invitationName: "Ama",
      eventTitle: "AURELIA",
      guests: [{ name: "Ama", qrToken: "ama-token", archivedAt: new Date().toISOString() }],
    });
    assert.equal(resolved, null);
  });

  it("does not lock an open-host invitation to a roster guest without a token", () => {
    const resolved = resolveSocialInvitationGuest({
      invitationName: "Traditional Marriage Ceremony",
      eventTitle: "Traditional Marriage Ceremony",
      guests: [{ name: "Ama Mensah", qrToken: "ama-token" }],
    });
    assert.equal(resolved, null);
  });

  it("preserves sole-assigned personalization without a guest query param", () => {
    const resolved = resolveSocialInvitationGuest({
      invitationName: "Ama",
      eventTitle: "AURELIA",
      guests: [{ name: "Ama", qrToken: "ama-token" }],
    });
    assert.equal(resolved?.displayName, "Ama");
    assert.equal(resolved?.guestToken, "ama-token");
  });

  it("does not treat a mismatched token as another guest on the same invitation", () => {
    const resolved = resolveSocialInvitationGuest({
      guestToken: "ama-token",
      tokenGuest: { name: "Kofi", qrToken: "kofi-token" },
      invitationName: "Ama",
      eventTitle: "AURELIA",
      guests: [
        { name: "Ama", qrToken: "ama-token" },
        { name: "Kofi", qrToken: "kofi-token" },
      ],
    });
    assert.equal(resolved, null);
  });

  it("never uses cookies, session, or browser state — only URL and invitation records", () => {
    const params = [
      "guestToken",
      "tokenGuest",
      "invitationName",
      "isGeneralPass",
      "eventTitle",
      "guests",
    ];
    assert.deepEqual(
      params.sort(),
      ["eventTitle", "guestToken", "guests", "invitationName", "isGeneralPass", "tokenGuest"].sort()
    );
    assert.ok(!params.includes("cookie"));
    assert.ok(!params.includes("localStorage"));
    assert.ok(!params.includes("session"));
  });
});

describe("parseAssignedGuestGreeting", () => {
  it("keeps an organiser-typed honorific and never invents one", () => {
    assert.deepEqual(parseAssignedGuestGreeting("Mr Kwame Mensah"), {
      salutation: "Dear",
      honorific: "Mr",
      name: "Kwame Mensah",
      line: "Dear Mr Kwame Mensah",
    });
    assert.deepEqual(parseAssignedGuestGreeting("Mrs. Ama Serwaa"), {
      salutation: "Dear",
      honorific: "Mrs",
      name: "Ama Serwaa",
      line: "Dear Mrs Ama Serwaa",
    });
    assert.deepEqual(parseAssignedGuestGreeting("Miss Esther"), {
      salutation: "Dear",
      honorific: "Miss",
      name: "Esther",
      line: "Dear Miss Esther",
    });
    assert.deepEqual(parseAssignedGuestGreeting("Mr. & Mrs. Mensah"), {
      salutation: "Dear",
      honorific: "Mr & Mrs",
      name: "Mensah",
      line: "Dear Mr & Mrs Mensah",
    });
    assert.deepEqual(parseAssignedGuestGreeting("Ama"), {
      salutation: "Dear",
      honorific: null,
      name: "Ama",
      line: "Dear Ama",
    });
    assert.equal(parseAssignedGuestGreeting("Pastor Christopher Fiave")?.line, "Dear Pastor Christopher Fiave");
    assert.equal(formatSocialGuestGreeting("Pastor Christopher Fiave"), "Dear Pastor Christopher Fiave,");
    assert.equal(parseAssignedGuestGreeting("Dear Ama")?.line, "Dear Ama");
    assert.equal(formatSocialGuestGreeting("Mrs Ama Serwaa"), "Dear Mrs Ama Serwaa,");
    assert.equal(parseAssignedGuestGreeting("ama@example.com"), null);
  });
});
