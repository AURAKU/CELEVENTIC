import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CeleYouSmartShareEngine,
  detectSmartShareCapability,
} from "@/lib/celeyou-share/engine";
import {
  ZERO_INSTALL_RECIPIENT_MATRIX,
  recipientMatrixNeverClaimsPhoneNfcP2P,
} from "@/lib/celeyou-share/recipient-matrix";
import { guestPrimaryActions } from "@/lib/celeyou-share/guest-actions";
import { guestIdentitySections } from "@/lib/celeyou-share/profile-sections";
import { celeYouShareIdentity } from "@/lib/digital-business-card/share-identity";
import {
  buildCeleYouWalletPass,
  walletPassClaimsPhoneNfc,
  walletPassGuidance,
} from "@/lib/celeyou-share/wallet-pass";
import {
  celeYouActivityLabel,
  isAutomatedPreviewAgent,
  isCeleYouPublicEventKind,
} from "@/lib/celeyou-share/events";
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
    assert.equal(
      ZERO_INSTALL_RECIPIENT_MATRIX.filter((row) => row.id !== "celeyou-app").every((row) => row.appRequired === false),
      true
    );
  });

  it("recommends QR or a link when the browser cannot open a share sheet", () => {
    const capability = detectSmartShareCapability(null);
    assert.equal(capability.hasWebShare, false);
    assert.equal(["qr", "https-link"].includes(capability.recommended), true);
    assert.equal(capability.airDropInShareSheet, false);
    assert.equal(capability.alternatives.includes("https-link") || capability.recommended === "https-link", true);
    assert.equal(/cannot start AirDrop or Quick Share by touching/i.test(capability.nearbyGuidance), true);
    const engine = new CeleYouSmartShareEngine(null);
    assert.equal(engine.route()[0], engine.capability.recommended);
    assert.equal(engine.route().includes("qr"), true);
    assert.equal(engine.route().includes("https-link"), true);
    assert.equal(celeYouActivityLabel("nfc_tap"), "NFC card opened");
    assert.equal(celeYouActivityLabel("qr_open"), "QR opened");
    const identity = celeYouShareIdentity({
      slug: "kojo-mensah",
      publicToken: "cmqr_kojo",
      nfcToken: "cmnfc_kojo",
      origin: "https://www.celeventic.com",
    });
    assert.equal(engine.landsOnSameProfile(identity), true);
    assert.equal(walletPassClaimsPhoneNfc(), false);
    assert.match(walletPassGuidance({}), /no CeleYou app/i);
    const pass = buildCeleYouWalletPass({
      displayName: "Kojo Mensah",
      profileUrl: identity.profileUrl,
      qrUrl: identity.qrUrl,
    });
    assert.equal(pass.phoneNfcTransfer, false);
    assert.equal(pass.qrUrl, identity.qrUrl);
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
    assert.equal(actions.find((action) => action.id === "whatsapp")?.label, "WhatsApp");
  });

  it("uses WhatsApp Business as the guest chat tap when personal WhatsApp is missing", () => {
    const card = {
      slug: "ama-serwaa",
      guestReach: [
        {
          id: "whatsappbusiness-0",
          brand: "whatsappbusiness",
          title: "WhatsApp Business",
          subtitle: null,
          href: "https://wa.me/233240000000",
          appHref: "whatsapp://send?phone=233240000000",
          surface: "stack",
        },
      ],
    } as DigitalCardPublicPayload;
    const actions = guestPrimaryActions(card);
    const chat = actions.find((action) => action.id === "whatsapp");
    assert.equal(chat?.label, "WhatsApp Business");
    assert.equal(chat?.href, "whatsapp://send?phone=233240000000");
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

  it("keeps SHARE MY CELEYOU actions on the studio desk without claiming phone NFC", () => {
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    assert.match(desk, /SHARE_MY_CARD_CTA/);
    assert.match(desk, /NEARBY_SHARE_CTA/);
    assert.match(desk, /same public profile/);
    assert.match(desk, /WALLET_PASS_CTA/);
    assert.match(desk, /SAVE_CONTACT_CTA/);
    assert.match(desk, /SHARE_CONTACT_FILE_CTA/);
    assert.match(desk, /CeleYouNameDropSetup/);
    assert.match(desk, /shareDeskActionOrder/);
    assert.match(desk, /Load more|fallbackGuidance/);
    const analytics = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-analytics-panel.tsx"),
      "utf8"
    );
    assert.match(analytics, /Load more/);
    assert.match(analytics, /A nearby phone is not a tap/);
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
