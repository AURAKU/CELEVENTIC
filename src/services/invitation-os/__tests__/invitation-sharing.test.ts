import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { InvitationSharingService } from "../invitation-sharing.service";

describe("InvitationSharingService.buildWhatsAppPack", () => {
  const service = new InvitationSharingService();
  let previousAppUrl: string | undefined;

  before(() => {
    previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.celeventic.com";
  });

  after(() => {
    process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  it("builds a live-domain share link from a relative sharePath", () => {
    const pack = service.buildWhatsAppPack({
      eventTitle: "Jeffery & Francisca's Wedding",
      sharePath: "/invite/abc123",
    });
    assert.equal(pack.shareLink, "https://www.celeventic.com/invite/abc123");
    assert.doesNotMatch(pack.shareLink, /localhost/);
    assert.match(pack.generalText, /https:\/\/www\.celeventic\.com\/invite\/abc123/);
  });

  it("never emits a mangled double-URL when given an already-absolute sharePath", () => {
    // Regression guard: the WhatsApp route previously passed the *raw*,
    // unsanitized `order.shareUrl` here instead of the sanitized relative
    // `sharePath`, which — for a stale absolute URL — got concatenated onto
    // `appUrl` into a broken link like "https://www.celeventic.com/http://localhost:3000/invite/x".
    const pack = service.buildWhatsAppPack({
      eventTitle: "Some Event",
      sharePath: "https://www.celeventic.com/invite/xyz789",
    });
    assert.equal(
      (pack.shareLink.match(/https?:\/\//g) ?? []).length,
      1,
      `expected exactly one scheme in ${pack.shareLink}`
    );
  });

  it("personalizes guest links off the same sanitized base", () => {
    const pack = service.buildWhatsAppPack({
      eventTitle: "Ama's Birthday",
      sharePath: "/invite/xyz789",
    });
    const link = pack.guestPersonalizedLink("tok_123", "Kwame");
    assert.equal(link, "https://www.celeventic.com/invite/xyz789?guest=tok_123");
    assert.doesNotMatch(link, /localhost/);
  });

  it("keeps a single invite URL in guest WhatsApp copy", () => {
    const pack = service.buildWhatsAppPack({
      eventTitle: "Ama's Birthday",
      sharePath: "https://www.celeventic.com/https://www.celeventic.com/invite/xyz789",
      hostName: "Ama",
    });
    const message = pack.guestMessage("Kwame", "tok_123");
    assert.equal(
      (message.match(/https?:\/\/www\.celeventic\.com\/invite\/xyz789/g) ?? []).length,
      1
    );
    assert.doesNotMatch(message, /there\.,/);
  });
});
