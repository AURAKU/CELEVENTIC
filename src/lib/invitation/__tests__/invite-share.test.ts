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

  it("builds funeral memorial share copy without celebration language", () => {
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
    assert.match(payload.title, /OBAAPANIN VIDA SERWAA/i);
    assert.match(payload.text, /honour/i);
    assert.doesNotMatch(payload.text, /celebrate/i);
    assert.equal(payload.url, "https://celeventic.com/invite/abc123");
  });

  it("keeps generic wedding share copy on the event title", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "gala",
      origin: "https://celeventic.com",
      event: {
        title: "Founders' Day Gala",
        hostName: "Ama",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
    });
    assert.equal(payload.title, "Founders' Day Gala");
    assert.match(payload.text, /Founders' Day Gala/);
  });

  it("uses event-facing Aurelia share copy instead of the template name", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "enock-ruth",
      origin: "https://celeventic.com",
      catalogSlug: "aurelia-editorial-wedding",
      layoutSlug: "aurelia-editorial-wedding",
      event: {
        title: "AURELIA",
        hostName: "Enock & Ruth",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
      partnerOneName: "Enock",
      partnerTwoName: "Ruth",
    });
    assert.equal(payload.title, "Enock & Ruth");
    assert.equal(payload.text, "You're invited to Enock & Ruth.");
    assert.equal(payload.url, "https://celeventic.com/invite/enock-ruth");
    assert.doesNotMatch(`${payload.title} ${payload.text}`, /Aurelia/i);
  });

  it("uses event-facing Seraphine share copy instead of Seraphine Champagne", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "kojo-fafa",
      origin: "https://celeventic.com",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      invitationName: "Kojo & Fafa Seraphine",
      event: {
        title: "Seraphine Champagne",
        hostName: "Kojo & Fafa",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
    });
    assert.equal(payload.title, "Kojo & Fafa");
    assert.doesNotMatch(`${payload.title} ${payload.text}`, /Seraphine|Champagne/i);
  });

  it("preserves the personalized invitation URL and Dear copy in the native share payload", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "kojo-fafa",
      origin: "https://celeventic.com",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      guestDisplayName: "Ama",
      guestToken: "ama-token",
      event: {
        title: "Seraphine Champagne",
        hostName: "Kojo & Fafa",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
    });
    assert.equal(payload.title, "Kojo & Fafa");
    assert.equal(payload.text, "Dear Ama, you're invited to Kojo & Fafa.");
    assert.equal(payload.url, "https://celeventic.com/invite/kojo-fafa?guest=ama-token");
    assert.doesNotMatch(`${payload.title} ${payload.text} ${payload.url}`, /Seraphine|Aurelia/i);
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
