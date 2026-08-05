import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inviteLinkCandidates,
  inviteLinkIsCanonical,
  isPlausibleInviteToken,
  normalizeInviteLink,
  safeDecodeURIComponent,
} from "../invite-link";

/**
 * A real token from the production shape of `Invitation.uniqueLink`, with both
 * upper and lower case so case-sensitivity regressions are visible, and a `_-`
 * pair so base64url handling is exercised.
 */
const TOKEN = "aB3_dE-fGh9JkLmN0pQrS2tUvW4xYz67";

describe("normalizeInviteLink — carriers that mangle links", () => {
  it("leaves a clean token untouched", () => {
    assert.equal(normalizeInviteLink(TOKEN), TOKEN);
  });

  it("is idempotent for every mangled form", () => {
    for (const raw of [
      `  ${TOKEN}  `,
      `<https://celeventic.com/invite/${TOKEN}>`,
      `https://celeventic.com/invite/${TOKEN}/`,
      `%20${TOKEN}%20`,
      `${TOKEN}.`,
    ]) {
      const once = normalizeInviteLink(raw);
      assert.equal(normalizeInviteLink(once), once, `not idempotent for ${raw}`);
    }
  });

  it("strips surrounding whitespace", () => {
    assert.equal(normalizeInviteLink(`  ${TOKEN}\n`), TOKEN);
    assert.equal(normalizeInviteLink(`\t${TOKEN} `), TOKEN);
  });

  it("removes zero-width and non-breaking characters from rich-text paste", () => {
    assert.equal(normalizeInviteLink(`\u200B${TOKEN}\uFEFF`), TOKEN);
    assert.equal(normalizeInviteLink(`\u00A0${TOKEN}\u202F`), TOKEN);
  });

  it("collapses a token line-wrapped by an email client", () => {
    const wrapped = `${TOKEN.slice(0, 16)}\n   ${TOKEN.slice(16)}`;
    assert.equal(normalizeInviteLink(wrapped), TOKEN);
  });

  it("decodes percent-encoding, including double-encoding", () => {
    assert.equal(normalizeInviteLink(`%20${TOKEN}`), TOKEN);
    // WhatsApp / CRM senders double-encode: %2520 → %20 → " ".
    assert.equal(normalizeInviteLink(`%2520${TOKEN}`), TOKEN);
  });

  it("survives a malformed percent sequence instead of throwing", () => {
    assert.doesNotThrow(() => normalizeInviteLink("%E0%A4%A"));
    assert.equal(normalizeInviteLink(`${TOKEN}%`), `${TOKEN}%`);
  });

  it("unwraps RFC 3986 angle brackets and quotes added by mail clients", () => {
    assert.equal(normalizeInviteLink(`<${TOKEN}>`), TOKEN);
    assert.equal(normalizeInviteLink(`"${TOKEN}"`), TOKEN);
    assert.equal(normalizeInviteLink(`\u201C${TOKEN}\u201D`), TOKEN);
    assert.equal(normalizeInviteLink(`(${TOKEN})`), TOKEN);
  });

  it("reduces a full URL to its token", () => {
    for (const raw of [
      `https://celeventic.com/invite/${TOKEN}`,
      `https://celeventic.com/invite/${TOKEN}/`,
      `http://localhost:3000/invite/${TOKEN}`,
      `celeventic.com/invite/${TOKEN}`,
      `/invite/${TOKEN}`,
      `${TOKEN}/`,
    ]) {
      assert.equal(normalizeInviteLink(raw), TOKEN, `failed for ${raw}`);
    }
  });

  it("drops query strings and fragments", () => {
    assert.equal(normalizeInviteLink(`/invite/${TOKEN}?guest=abc`), TOKEN);
    assert.equal(normalizeInviteLink(`/invite/${TOKEN}#top`), TOKEN);
    assert.equal(
      normalizeInviteLink(`https://celeventic.com/invite/${TOKEN}?utm_source=wa#x`),
      TOKEN
    );
  });

  it("keeps the token when a sub-route is appended", () => {
    assert.equal(normalizeInviteLink(`/invite/${TOKEN}/event-day`), TOKEN);
  });

  it("returns empty string for values with no usable token", () => {
    for (const raw of [null, undefined, "", "   ", "\u200B", "/", "///"]) {
      assert.equal(normalizeInviteLink(raw), "", `expected empty for ${String(raw)}`);
    }
  });
});

/**
 * The token is a bearer credential. Normalisation may only ever *repair
 * transport damage* — it must never fold two distinct tokens together, and it
 * must never change the token's own characters.
 */
describe("normalizeInviteLink — never weakens the token", () => {
  it("preserves case exactly", () => {
    assert.equal(normalizeInviteLink(TOKEN), TOKEN);
    assert.notEqual(normalizeInviteLink(TOKEN), TOKEN.toLowerCase());
    assert.notEqual(normalizeInviteLink(TOKEN), TOKEN.toUpperCase());
  });

  it("keeps case-distinct tokens distinct", () => {
    assert.notEqual(normalizeInviteLink("aBcDeFgH"), normalizeInviteLink("AbCdEfGh"));
  });

  it("never strips the base64url characters `_` and `-`", () => {
    assert.equal(normalizeInviteLink("_-abc123_-"), "_-abc123_-");
    assert.equal(
      normalizeInviteLink("0RGjaVW9UAd9Dv_D_O64GxCIIH4-xPd_"),
      "0RGjaVW9UAd9Dv_D_O64GxCIIH4-xPd_"
    );
  });

  it("does not invent a token from a bare host", () => {
    assert.equal(normalizeInviteLink("https://celeventic.com/"), "celeventic.com");
    assert.ok(!isPlausibleInviteToken(normalizeInviteLink("https://celeventic.com/")));
  });
});

describe("safeDecodeURIComponent", () => {
  it("returns the input unchanged when there is nothing to decode", () => {
    assert.equal(safeDecodeURIComponent(TOKEN), TOKEN);
  });

  it("never throws on a malformed sequence", () => {
    assert.doesNotThrow(() => safeDecodeURIComponent("%"));
    assert.equal(safeDecodeURIComponent("%"), "%");
  });

  it("terminates on a value that decodes indefinitely", () => {
    // %2525…: each pass yields another `%25`. Must bound its passes.
    assert.doesNotThrow(() => safeDecodeURIComponent("%252525252525"));
  });
});

describe("isPlausibleInviteToken", () => {
  it("accepts real token shapes", () => {
    assert.ok(isPlausibleInviteToken(TOKEN));
    assert.ok(isPlausibleInviteToken("QZ71kmTbVLXPqH4Wjyrpne8M3BHel7P2"));
  });

  it("rejects anything that is not a bare URL-safe token", () => {
    for (const value of [
      null,
      undefined,
      "",
      "short",
      "has space",
      "has/slash",
      "has.dot",
      "celeventic.com",
      `https://celeventic.com/invite/${TOKEN}`,
      "a".repeat(129),
    ]) {
      assert.ok(!isPlausibleInviteToken(value), `should reject ${String(value)}`);
    }
  });
});

/**
 * Lookup order is a security property, not a convenience. Index 0 must always be
 * the caller's untouched value, so a token that legitimately differs from its
 * normalised form can never be shadowed by a more permissive variant.
 */
describe("inviteLinkCandidates — exact match always first", () => {
  it("yields exactly one candidate for a clean token", () => {
    assert.deepEqual(inviteLinkCandidates(TOKEN), [TOKEN]);
  });

  it("puts the untouched value first when repair is needed", () => {
    const raw = `<https://celeventic.com/invite/${TOKEN}>`;
    const candidates = inviteLinkCandidates(raw);
    assert.equal(candidates[0], raw);
    assert.ok(candidates.includes(TOKEN));
  });

  it("de-duplicates", () => {
    const candidates = inviteLinkCandidates(TOKEN);
    assert.equal(new Set(candidates).size, candidates.length);
  });

  it("offers a de-punctuated candidate for a link pasted mid-sentence", () => {
    assert.ok(inviteLinkCandidates(`/invite/${TOKEN}.`).includes(TOKEN));
    assert.ok(inviteLinkCandidates(`${TOKEN},`).includes(TOKEN));
  });

  it("never yields an empty candidate", () => {
    for (const raw of [null, undefined, "", "   ", "/"]) {
      assert.ok(
        inviteLinkCandidates(raw).every((c) => c.length > 0),
        `empty candidate for ${String(raw)}`
      );
    }
  });

  it("yields no candidates at all for junk", () => {
    assert.deepEqual(inviteLinkCandidates(""), []);
    assert.deepEqual(inviteLinkCandidates(null), []);
  });
});

describe("inviteLinkIsCanonical — keeps the clean path at one query", () => {
  it("is true for a clean token", () => {
    assert.ok(inviteLinkIsCanonical(TOKEN));
  });

  it("is false for every form needing repair", () => {
    for (const raw of [
      ` ${TOKEN}`,
      `${TOKEN} `,
      `<${TOKEN}>`,
      `/invite/${TOKEN}`,
      `${TOKEN}/`,
      `%20${TOKEN}`,
    ]) {
      assert.ok(!inviteLinkIsCanonical(raw), `should not be canonical: ${raw}`);
    }
  });

  it("is false for empty input", () => {
    assert.ok(!inviteLinkIsCanonical(""));
    assert.ok(!inviteLinkIsCanonical(null));
  });
});

/**
 * Legacy links already in guests' hands. These were minted before normalisation
 * existed and must keep resolving byte-for-byte — a normalisation change that
 * alters them would silently invalidate every invitation already sent.
 *
 * Synthetic values that reproduce every shape in production (32-char legacy
 * alphanumeric, base64url with `_` and `-`, leading digit, trailing `_`).
 * Never a real token: this file is committed, tokens are bearer credentials.
 */
describe("legacy link compatibility", () => {
  const legacy = [
    "QZ71kmTbVLXPqH4Wjyrpne8M3BHel7P2",
    "jCAbKEFZJXNcCUdeMWPzALsetkSlOpqJ",
    "0RGjaVW9UAd9Dv_D_O64GxCIIH4-xPd_",
    "aa11BB22cc33DD44ee55FF66gg77HH88",
    "Zz-_09Zz-_09Zz-_09Zz-_09Zz-_09Zz",
  ];

  it("passes every legacy token through unchanged", () => {
    for (const token of legacy) {
      assert.equal(normalizeInviteLink(token), token);
      assert.ok(inviteLinkIsCanonical(token), `${token} should need no repair`);
      assert.deepEqual(inviteLinkCandidates(token), [token]);
    }
  });

  it("still resolves a legacy token wrapped in a shared URL", () => {
    for (const token of legacy) {
      assert.equal(normalizeInviteLink(`https://celeventic.com/invite/${token}`), token);
    }
  });
});
