import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  CeleYouSmartShareEngine,
  detectSmartShareCapability,
  shareCeleYouProfile,
} from "@/lib/celeyou-share/engine";
import {
  ZERO_INSTALL_RECIPIENT_MATRIX,
  recipientMatrixNeverClaimsPhoneNfcP2P,
} from "@/lib/celeyou-share/recipient-matrix";
import { guestPrimaryActions, guestReachEventKind } from "@/lib/celeyou-share/guest-actions";
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
  shouldCountCeleYouGuestStat,
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
    assert.match(walletPassGuidance({} as NodeJS.ProcessEnv), /no CeleYou app/i);
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
    const pay = guestIdentitySections(card, [
      {
        id: "bank-0",
        brand: "bank",
        title: "CalBank",
        subtitle: null,
        href: "",
        surface: "stack",
      },
    ]);
    assert.equal(pay.find((section) => section.id === "products")?.label, "Payment Channels & Wallet");
  });

  it("keeps SHARE MY CELEYOU actions on the studio desk without claiming phone NFC", () => {
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    assert.match(desk, /SHARE_MY_CARD_CTA/);
    assert.doesNotMatch(desk, /NEARBY_SHARE_CTA/);
    assert.doesNotMatch(desk, /SHARE_VIA_APPS_CTA/);
    assert.doesNotMatch(desk, /SHOW_QR_CTA/);
    assert.doesNotMatch(desk, /same public profile/);
    assert.match(desk, /WALLET_PASS_CTA/);
    assert.match(desk, /SAVE_CONTACT_CTA/);
    assert.match(desk, /COPY_PROFILE_LINK_CTA/);
    assert.doesNotMatch(desk, /SHARE_CONTACT_FILE_CTA/);
    assert.match(desk, /CeleYouNameDropSetup/);
    assert.doesNotMatch(desk, /shareDeskActionOrder/);
    const analytics = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-analytics-panel.tsx"),
      "utf8"
    );
    assert.doesNotMatch(analytics, /Load more/);
    assert.match(analytics, /Live counts from people who open this CeleYou/);
    assert.doesNotMatch(analytics, /A nearby phone is not a tap/);
  });

  it("attaches a captured on-screen plate before fetching OG tiles", async () => {
    const payloads: Array<Record<string, unknown>> = [];
    let fetched = 0;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetched += 1;
      return new Response("should-not-fetch", { status: 500 });
    }) as typeof fetch;
    const plate = new File([new Uint8Array(128).fill(7)], "live-face.png", { type: "image/png" });
    try {
      const result = await shareCeleYouProfile(
        {
          title: "Kojo Mensah on CeleYou",
          text: "Kojo Mensah on CeleYou. One Identity. Infinite Connections.",
          url: "https://www.celeventic.com/u/kojo-mensah",
          imageUrl: "/brand/icon.png",
          capturePlate: async () => plate,
        },
        {
          share: async (payload: ShareData) => {
            payloads.push(payload as Record<string, unknown>);
          },
          canShare: (payload?: ShareData) => Boolean(payload?.files?.length),
        } as Navigator
      );
      assert.equal(result, "shared");
      assert.equal(fetched, 0);
      const files = payloads[0]?.files as File[] | undefined;
      assert.equal(files?.[0]?.name, "celeyou-plate.png");
      assert.equal(files?.[0]?.size, 128);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("attaches the live plate PNG and public URL on the share sheet", async () => {
    const payloads: Array<Record<string, unknown>> = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(new Uint8Array(96), {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as typeof fetch;
    try {
      const result = await shareCeleYouProfile(
        {
          title: "Kojo Mensah on CeleYou",
          text: "Kojo Mensah on CeleYou. One Identity. Infinite Connections.",
          url: "https://www.celeventic.com/u/kojo-mensah",
          imageUrl: [
            "/api/digital-business-cards/public/kojo-mensah/card?download=1&v=live",
            "/card/kojo-mensah/og?v=live",
          ],
        },
        {
          share: async (payload: ShareData) => {
            payloads.push(payload as Record<string, unknown>);
          },
          canShare: (payload?: ShareData) => Boolean(payload?.files?.length),
        } as Navigator
      );
      assert.equal(result, "shared");
      assert.equal(payloads.length, 1);
      assert.equal(payloads[0]?.url, undefined);
      assert.match(String(payloads[0]?.text), /https:\/\/www\.celeventic\.com\/u\/kojo-mensah/);
      const files = payloads[0]?.files as File[] | undefined;
      assert.equal(files?.[0]?.name, "celeyou-plate.png");
      assert.equal(files?.[0]?.type, "image/png");
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("uses the OG plate tile when the export PNG is missing", async () => {
    const requested: string[] = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requested.push(url);
      if (url.includes("/card?")) return new Response("missing", { status: 404 });
      return new Response(new Uint8Array(96), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }) as typeof fetch;
    try {
      const payloads: Array<Record<string, unknown>> = [];
      const result = await shareCeleYouProfile(
        {
          title: "Kojo Mensah on CeleYou",
          text: "Kojo Mensah on CeleYou. One Identity. Infinite Connections.",
          url: "https://www.celeventic.com/u/kojo-mensah",
          imageUrl: [
            "/api/digital-business-cards/public/kojo-mensah/card?download=1",
            "/card/kojo-mensah/og?v=live",
          ],
        },
        {
          share: async (payload: ShareData) => {
            payloads.push(payload as Record<string, unknown>);
          },
        } as Navigator
      );
      assert.equal(result, "shared");
      assert.ok(requested.some((url) => url.includes("/og?v=live")));
      const files = payloads[0]?.files as File[] | undefined;
      assert.equal(files?.[0]?.name, "celeyou-plate.png");
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("accepts only public guest events and ignores crawlers", () => {
    assert.equal(isCeleYouPublicEventKind("vcard_save"), true);
    assert.equal(isCeleYouPublicEventKind("userId"), false);
    assert.equal(isAutomatedPreviewAgent("facebookexternalhit/1.1"), true);
    assert.equal(isAutomatedPreviewAgent("WhatsApp/2.2490.2"), true);
    assert.equal(isAutomatedPreviewAgent("Twitterbot/1.0"), true);
    assert.equal(isAutomatedPreviewAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), false);
    assert.equal(
      isAutomatedPreviewAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.8.0"
      ),
      false
    );
  });

  it("maps guest reach taps and skips owner or crawler counts", () => {
    assert.equal(guestReachEventKind({ brand: "phone", href: "tel:+233240000000" }), "call_tap");
    assert.equal(
      guestReachEventKind({ brand: "whatsappbusiness", href: "https://wa.me/233240000000" }),
      "whatsapp_tap"
    );
    assert.equal(guestReachEventKind({ brand: "email", href: "mailto:ama@folio.test" }), "email_tap");
    assert.equal(guestReachEventKind({ brand: "website", href: "https://folio.test" }), "website_tap");
    assert.equal(guestReachEventKind({ brand: "linkedin", href: "https://linkedin.com/in/ama" }), null);
    assert.equal(guestReachEventKind({ brand: "phone", href: "tel:+233", locked: true }), null);
    assert.equal(
      shouldCountCeleYouGuestStat({ ownerUserId: "owner", viewerUserId: "owner", userAgent: "Mozilla/5.0 Safari" }),
      false
    );
    assert.equal(
      shouldCountCeleYouGuestStat({ ownerUserId: "owner", viewerUserId: "guest", userAgent: "Mozilla/5.0 Safari" }),
      true
    );
    const grid = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-reach-grid.tsx"),
      "utf8"
    );
    assert.match(grid, /trackGuestReach/);
    assert.match(grid, /guestReachEventKind/);
    const analytics = readFileSync(
      join(process.cwd(), "src/services/digital-business-card/digital-business-card.service.ts"),
      "utf8"
    );
    assert.match(analytics, /smartCardConnection\.count/);
    assert.match(analytics, /recordDigitalCardGuestOpen/);
  });
});
