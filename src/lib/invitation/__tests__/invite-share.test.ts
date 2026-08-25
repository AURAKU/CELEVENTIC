import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteShareChannelHref,
  buildInviteSharePayload,
  resolveInviteShareUrl,
} from "@/lib/invitation/invite-share";

describe("invite share", () => {
  it("builds a canonical invite URL from uniqueLink", () => {
    assert.equal(
      resolveInviteShareUrl({
        uniqueLink: "abc123",
        origin: "https://celeventic.com",
      }),
      "https://celeventic.com/invite/abc123"
    );
  });

  it("builds funeral memorial share copy", () => {
    const payload = buildInviteSharePayload({
      category: "funeral",
      uniqueLink: "abc123",
      origin: "https://celeventic.com",
      event: {
        title: "THE FUNERAL",
        hostName: "OBAAPANIN VIDA SERWAA",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
        deceasedName: "OBAAPANIN VIDA SERWAA A.K.A MADAM VIDA",
      },
    });
    assert.match(payload.title, /loving memory/i);
    assert.match(payload.text, /memorial/i);
    assert.equal(payload.url, "https://celeventic.com/invite/abc123");
  });

  it("builds WhatsApp and email channel hrefs", () => {
    const payload = {
      title: "In loving memory of Madam Vida",
      text: "You're invited to the memorial service.",
      url: "https://celeventic.com/invite/abc123",
    };
    assert.match(buildInviteShareChannelHref("whatsapp", payload), /wa\.me/);
    assert.match(buildInviteShareChannelHref("email", payload), /^mailto:/);
    assert.match(buildInviteShareChannelHref("facebook", payload), /facebook\.com\/sharer/);
  });
});
