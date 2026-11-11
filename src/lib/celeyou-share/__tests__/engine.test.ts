import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectSmartShareCapability } from "@/lib/celeyou-share/engine";
import {
  ZERO_INSTALL_RECIPIENT_MATRIX,
  recipientMatrixNeverClaimsPhoneNfcP2P,
} from "@/lib/celeyou-share/recipient-matrix";
import { guestPrimaryActions } from "@/lib/celeyou-share/guest-actions";
import { guestIdentitySections } from "@/lib/celeyou-share/profile-sections";
import { isAutomatedPreviewAgent, isCeleYouPublicEventKind } from "@/lib/celeyou-share/events";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";

describe("CeleYou Smart Share Engine", () => {
  it("never claims automatic phone to phone NFC for zero-install recipients", () => {
    for (const row of ZERO_INSTALL_RECIPIENT_MATRIX) {
      assert.equal(row.opensInBrowser, true);
      assert.equal(row.appRequired === false || row.appRequired === "optional", true);
      assert.equal(recipientMatrixNeverClaimsPhoneNfcP2P(row), true);
    }
    const iphone = ZERO_INSTALL_RECIPIENT_MATRIX.find((row) => row.id === "iphone-no-app");
    assert.ok(iphone?.today.includes("No CeleYou install"));
  });

  it("recommends QR or a link when the browser cannot open a share sheet", () => {
    const capability = detectSmartShareCapability(null);
    assert.equal(capability.hasWebShare, false);
    assert.equal(["qr", "https-link"].includes(capability.recommended), true);
    assert.equal(capability.airDropInShareSheet, false);
    assert.equal(capability.alternatives.includes("https-link") || capability.recommended === "https-link", true);
    assert.equal(/cannot start AirDrop or Quick Share by touching/i.test(capability.nearbyGuidance), true);
  });

  it("offers Call and WhatsApp only from published unlocked details", () => {
    const card = {
      slug: "ama-serwaa",
      displayName: "Ama Serwaa",
      guestReach: [
        { id: "phone-0", brand: "phone", title: "Mobile", subtitle: null, href: "tel:+233240000000", surface: "stack" },
        {
          id: "phone-1",
          brand: "phone",
          title: "Hidden",
          subtitle: null,
          href: "tel:+233200000000",
          surface: "stack",
          locked: true,
        },
        {
          id: "whatsapp-0",
          brand: "whatsapp",
          title: "WhatsApp",
          subtitle: null,
          href: "https://wa.me/233240000000",
          surface: "stack",
        },
        { id: "email-0", brand: "email", title: "Mail", subtitle: null, href: "mailto:ama@folio.test", surface: "stack" },
        {
          id: "website-0",
          brand: "website",
          title: "Site",
          subtitle: null,
          href: "https://folio.test",
          surface: "stack",
        },
      ],
    } as DigitalCardPublicPayload;
    const actions = guestPrimaryActions(card);
    assert.deepEqual(
      actions.map((action) => action.id),
      ["save", "call", "whatsapp", "email", "website", "share"]
    );
    assert.equal(actions.find((action) => action.id === "call")?.href, "tel:+233240000000");
    assert.equal(
      actions.some((action) => action.href === "tel:+233200000000"),
      false
    );
  });

  it("groups published details into guest identity sections", () => {
    const card = {
      slug: "ama-serwaa",
      displayName: "Ama Serwaa",
      bio: "Creative director in Accra.",
      socials: {},
    } as DigitalCardPublicPayload;
    const sections = guestIdentitySections(card, [
      { id: "phone-0", brand: "phone", title: "Mobile", subtitle: null, href: "tel:+233240000000", surface: "stack" },
      { id: "github-0", brand: "github", title: "GitHub", subtitle: null, href: "https://github.com/ama", surface: "stack" },
    ]);
    assert.deepEqual(
      sections.map((section) => section.id),
      ["about", "contact", "portfolio"]
    );
    assert.equal(sections[0]?.body, "Creative director in Accra.");
  });

  it("accepts only public guest events and ignores crawlers", () => {
    assert.equal(isCeleYouPublicEventKind("vcard_save"), true);
    assert.equal(isCeleYouPublicEventKind("userId"), false);
    assert.equal(isAutomatedPreviewAgent("facebookexternalhit/1.1"), true);
    assert.equal(isAutomatedPreviewAgent("WhatsApp/2.2490.2"), true);
    assert.equal(isAutomatedPreviewAgent("Twitterbot/1.0"), true);
    assert.equal(isAutomatedPreviewAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), false);
  });
});
