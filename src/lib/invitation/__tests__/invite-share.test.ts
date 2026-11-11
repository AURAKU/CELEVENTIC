import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteShareChannelHref,
  buildInviteSharePayload,
  inviteShareClipboardHtml,
  inviteShareClipboardPlain,
  resolveInviteShareUrl,
  socialPlaceCardUrlFromInviteUrl,
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
    assert.match(payload.text, /Dear Ama,/);
    assert.match(payload.text, /You are personally invited\./);
    assert.doesNotMatch(payload.text, /Open your invitation:/);
    assert.doesNotMatch(payload.text, /https?:\/\//);
    assert.equal(payload.url, "https://celeventic.com/invite/kojo-fafa?guest=ama-token");
    assert.doesNotMatch(`${payload.title} ${payload.text} ${payload.url}`, /Seraphine|Aurelia/i);
  });

  it("keeps the admission code off the family share letter", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "9qsZeEvYS6k08i78n67WHelxMHK65oVE",
      origin: "https://www.celeventic.com",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      guestDisplayName: "Pastor Christopher Fiave",
      guestToken: "cmusgwbyy00n0lag9ozdkhgmj",
      admissionCode: "9180",
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
    assert.match(payload.text, /Dear Pastor Christopher Fiave,/);
    assert.match(payload.text, /You are personally invited\./);
    assert.doesNotMatch(payload.text, /Open your invitation:/);
    assert.doesNotMatch(payload.text, /admission code|9180/i);
    assert.doesNotMatch(payload.text, /https?:\/\//);
    assert.equal(
      payload.url,
      "https://www.celeventic.com/invite/9qsZeEvYS6k08i78n67WHelxMHK65oVE?guest=cmusgwbyy00n0lag9ozdkhgmj"
    );
  });

  it("shares Edwin and Lordina on the pretty public path", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK",
      origin: "https://www.celeventic.com",
      catalogSlug: "forever-afaris-wedding",
      layoutSlug: "forever-afaris-wedding",
      guestDisplayName: "Ama",
      guestToken: "ama-token",
      admissionCode: "9180",
      event: {
        title: "Edwin and Lordina",
        hostName: "Edwin Ebow Blankson",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
      partnerOneName: "Edwin",
      partnerTwoName: "Lordina",
    });
    assert.equal(payload.url, "https://www.celeventic.com/invite/edwin-and-lordina?guest=ama-token");
    assert.match(payload.text, /Dear Ama,/);
    assert.match(payload.text, /You are personally invited\./);
    assert.doesNotMatch(payload.text, /admission code|9180|ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK/i);
    const card = socialPlaceCardUrlFromInviteUrl(payload.url);
    assert.equal(
      card,
      "https://www.celeventic.com/api/social/invite/edwin-and-lordina/image?guest=ama-token"
    );
    const plain = inviteShareClipboardPlain(payload);
    assert.match(plain, /Dear Ama,/);
    assert.match(plain, /You are personally invited\./);
    assert.match(plain, /edwin-and-lordina/);
    const html = inviteShareClipboardHtml(payload, card);
    assert.match(html, /07-stool|edwin-and-lordina\/image/);
    assert.match(html, /Dear Ama,/);
    assert.match(html, /You are personally invited/);
    assert.match(html, /<img /);
  });

  it("uses the same letter for every template, without printing the link", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "akosua-yaw",
      origin: "https://celeventic.com",
      catalogSlug: "forever-afaris-wedding",
      layoutSlug: "forever-afaris-wedding",
      guestDisplayName: "Ama",
      guestToken: "ama-token",
      event: {
        title: "Forever Afaris",
        hostName: "Akosua & Yaw",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
    });
    assert.equal(payload.title, "Akosua & Yaw");
    assert.match(payload.text, /Dear Ama,/);
    assert.match(payload.text, /You are personally invited\./);
    assert.doesNotMatch(payload.text, /https?:\/\/|Open your invitation:/);
    assert.equal(payload.url, "https://celeventic.com/invite/akosua-yaw?guest=ama-token");
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
