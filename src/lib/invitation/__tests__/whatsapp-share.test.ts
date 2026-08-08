import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  buildInviteWhatsAppText,
  buildWhatsAppHref,
  collapseDuplicateAbsoluteUrl,
  ensureSingleShareUrl,
  openWhatsAppShare,
  resetWhatsAppShareGuardForTests,
} from "../whatsapp-share";

describe("whatsapp-share", () => {
  beforeEach(() => {
    resetWhatsAppShareGuardForTests();
  });

  it("collapses a mangled double-absolute invite URL to one scheme", () => {
    const mangled =
      "https://www.celeventic.com/https://www.celeventic.com/invite/abc?guest=tok";
    assert.equal(
      collapseDuplicateAbsoluteUrl(mangled),
      "https://www.celeventic.com/invite/abc?guest=tok"
    );
  });

  it("keeps the invite URL in the message exactly once", () => {
    const url = "https://www.celeventic.com/invite/abc?guest=tok";
    const text = buildInviteWhatsAppText({
      guestName: "Kwame",
      inviteUrl: url,
      admissionCode: "A1B2",
      eventTitle: "The Wedding",
    });
    assert.equal((text.match(/https:\/\/www\.celeventic\.com\/invite\/abc/g) ?? []).length, 1);
    assert.match(text, /admission code: A1B2/);
    assert.match(text, /Dear Kwame/);
  });

  it("ensureSingleShareUrl strips a duplicated URL already pasted in the body", () => {
    const url = "https://www.celeventic.com/invite/xyz";
    const text = ensureSingleShareUrl(`Hello\n${url}\n${url}`, url);
    assert.equal((text.match(/https:\/\/www\.celeventic\.com\/invite\/xyz/g) ?? []).length, 1);
  });

  it("builds wa.me with or without a phone", () => {
    assert.match(buildWhatsAppHref("hi", "+233244123456"), /wa\.me\/233244123456\?text=/);
    assert.match(buildWhatsAppHref("hi"), /^https:\/\/wa\.me\/\?text=/);
  });

  it("ignores a second open of the same share within the cooldown", () => {
    const opens: string[] = [];
    const originalOpen = globalThis.window?.open;
    // Minimal window stub for node tests.
    (globalThis as { window: { open: typeof window.open } }).window = {
      open: ((url?: string | URL) => {
        opens.push(String(url));
        return null;
      }) as typeof window.open,
    };
    try {
      assert.equal(openWhatsAppShare("once", "233244123456"), true);
      assert.equal(openWhatsAppShare("once", "233244123456"), false);
      assert.equal(opens.length, 1);
    } finally {
      if (originalOpen) {
        (globalThis as { window: { open: typeof window.open } }).window.open = originalOpen;
      }
    }
  });
});
