import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { DEMO_CARD } from "@/lib/digital-business-card/demo-card";
import {
  celecardHoldCoverSize,
  celecardHoldFitSize,
  celecardHoldPresent,
} from "@/lib/digital-business-card/hold-viewport";
import { digitalCardSocialHref, listDigitalCardReachItems } from "@/lib/digital-business-card/socials";
import { isVerifiedPayAppHref } from "@/lib/digital-business-card/wallet-quality";
import { guestIdentitySections, formatGuestAbout } from "@/lib/celeyou-share/profile-sections";
import { internationalTelHref, callingCodeFromPhones } from "@/lib/digital-business-card/phone-format";
import { isAllowedPublicQrDestination, celeYouAbsoluteGuestPayload } from "@/lib/digital-business-card/share-identity";
import { celecardNameFitCqw, celecardCompanyDisplayLines } from "@/lib/digital-business-card/type-voice";
function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou profile audit remediation", () => {
  it("1 fullscreen hold contain-fits the ID-1 card on portrait and landscape", () => {
    const portrait = [320, 375, 390, 430, 768].map((width) => celecardHoldFitSize(width, 844, "portrait"));
    for (const size of portrait) {
      assert.ok(size.width > 0 && size.height > 0);
      assert.ok(Math.abs(size.width / size.height - 85.6 / 54) < 0.002);
    }
    assert.equal(celecardHoldPresent(true, "portrait"), "plate");
    assert.equal(celecardHoldPresent(true, "landscape"), "plate");
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    const css = source("src/app/globals.css");
    assert.match(view, /celecard-hold-close/);
    assert.match(view, /celeyou\.close_fullscreen/);
    assert.match(view, /role=\{hold \? "dialog"/);
    assert.match(css, /celecard-hold-close/);
    assert.deepEqual(celecardHoldFitSize(390, 844, "portrait"), celecardHoldCoverSize(390, 844));
  });

  it("2 meeting booking stays in Business and empty sections stay hidden", () => {
    const reach = listDigitalCardReachItems(DEMO_CARD);
    const meeting = reach.find((item) => item.brand === "meeting");
    assert.ok(meeting);
    assert.match(meeting!.title, /sitting|meeting|book/i);
    const sections = guestIdentitySections(DEMO_CARD, reach);
    const business = sections.find((section) => section.id === "business");
    assert.ok(business);
    assert.ok(business!.items.some((item) => item.brand === "meeting"));
    const empty = guestIdentitySections(DEMO_CARD, reach.filter((item) => item.brand !== "meeting" && item.brand !== "location"));
    assert.equal(empty.some((section) => section.id === "business"), false);
    const grid = source("src/components/digital-business-card/digital-card-reach-grid.tsx");
    assert.match(grid, /isMeetingGroup\(group\)/);
    assert.match(grid, /DigitalCardMeetingDrop/);
  });

  it("3 payment and connect overlays sit above the dock", () => {
    const grid = source("src/components/digital-business-card/digital-card-reach-grid.tsx");
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(grid, /z-\[200\]/);
    assert.doesNotMatch(grid, /mb-\[4\.75rem\]/);
    assert.match(view, /z-\[200\]/);
    assert.match(view, /GuestLayer/);
    assert.match(grid, /dataset\.celecardSheet/);
  });

  it("4 MoMo is a copy sheet, not a telephone call", () => {
    assert.equal(digitalCardSocialHref("momo", "0244123456"), "");
    assert.equal(isVerifiedPayAppHref("tel:+233244123456"), false);
    const grid = source("src/components/digital-business-card/digital-card-reach-grid.tsx");
    assert.match(grid, /celeyou\.momo_howto/);
    const socials = source("src/lib/digital-business-card/socials.ts");
    assert.match(socials, /key: "momo"/);
    assert.doesNotMatch(socials, /key: "momo"[\s\S]{0,220}tel:\$\{digits/);
  });

  it("5 dock icons keep 48px targets and visible captions", () => {
    const grid = source("src/components/digital-business-card/digital-card-reach-grid.tsx");
    const css = source("src/app/globals.css");
    assert.match(grid, /celecard-dock-caption/);
    assert.match(css, /min-width: 48px/);
    assert.match(css, /celecard-dock-caption/);
  });

  it("6 footer padding tracks the measured dock height", () => {
    const css = source("src/app/globals.css");
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(css, /var\(--celecard-dock-h, 6\.75rem\)/);
    assert.match(view, /--celecard-dock-h/);
    assert.match(view, /ResizeObserver/);
  });

  it("7 Save Contact uses platform guidance and does not claim the contact was added", () => {
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(view, /contactSaveHintKey\(detectTapPlatform\(\)\)/);
    assert.match(view, /celeyou\.file_ready/);
    assert.match(view, /celecard-save-toast/);
  });

  it("8 internationalizes Ghana numbers when a +233 sibling is present", () => {
    assert.equal(internationalTelHref("+233 24 123 4567"), "tel:+233241234567");
    assert.equal(internationalTelHref("0241234567", "233"), "tel:+233241234567");
    assert.equal(internationalTelHref("02079460000"), "tel:02079460000");
    assert.equal(callingCodeFromPhones(["+233241234567", "0240000000"]), "233");
  });

  it("9 Connect Back keeps visible labels, email/tel types, and duplicate-submit guard", () => {
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    const route = source("src/app/api/digital-business-cards/connect/route.ts");
    assert.match(view, /type="email"/);
    assert.match(view, /type="tel"/);
    assert.match(view, /<label className="grid gap-1/);
    assert.match(view, /if \(connecting\) return/);
    assert.match(view, /role="alert"/);
    assert.match(view, /!form\.visitorEmail\.trim\(\) && !form\.visitorPhone\.trim\(\)/);
    assert.match(route, /Email or phone is required/);
    assert.match(route, /rateLimit\(`celecard-connect:/);
  });

  it("10 share tile contain-fits the card and compresses the crawler image", () => {
    const og = source("src/lib/digital-business-card/og-image.tsx");
    const markup = source("src/lib/digital-business-card/og-markup.tsx");
    assert.match(markup, /contain/);
    assert.match(og, /jpeg\(\{ quality: 78/);
    assert.match(og, /fit: "contain"/);
    const share = source("src/lib/digital-business-card/share.ts");
    assert.match(share, /type: "image\/jpeg"/);
  });

  it("11 entrance animation never starts from opacity 0", () => {
    const css = source("src/app/globals.css");
    assert.match(css, /\.celecard-enter \{[\s\S]*?opacity: 1;/);
    assert.match(css, /@keyframes celecard-rise \{[\s\S]*?from \{[\s\S]*?opacity: 1;/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });

  it("12 Next config hides powered-by and caches only static assets long-term", () => {
    const config = source("next.config.ts");
    assert.match(config, /poweredByHeader: false/);
    assert.match(config, /optimizePackageImports: \["lucide-react"\]/);
    assert.match(config, /\/_next\/static\/:path\*/);
    assert.doesNotMatch(config, /source: "\/u\/:slug"[\s\S]{0,80}s-maxage/);
  });

  it("13 QR data endpoint rejects arbitrary external destinations", () => {
    assert.equal(isAllowedPublicQrDestination("https://evil.example/phish"), false);
    assert.equal(isAllowedPublicQrDestination("javascript:alert(1)"), false);
    assert.equal(celeYouAbsoluteGuestPayload("https://evil.example/phish"), null);
    assert.ok(isAllowedPublicQrDestination("https://www.celeventic.com/c/cmqr_live"));
    const route = source("src/app/api/qr/image/route.ts");
    assert.match(route, /isAllowedPublicQrDestination/);
    assert.match(route, /destination not allowed/);
    const config = source("next.config.ts");
    assert.match(config, /X-Content-Type-Options/);
    assert.match(config, /X-Frame-Options/);
  });

  it("14 WhatsApp usernames are not silently rewritten to numbers", () => {
    const href = digitalCardSocialHref("whatsapp", "owuraku");
    assert.match(href, /owuraku|wa\.me|whatsapp/i);
    assert.equal(href.includes("233"), false);
  });

  it("15 About quote presentation drops a lone leading quote", () => {
    assert.equal(formatGuestAbout('"Building in public'), "Building in public");
    assert.equal(formatGuestAbout("\"Stay curious.\""), "Stay curious.");
  });

  it("16 user-facing copy prefers Digital Card over plate", () => {
    const extra = source("src/lib/i18n/extra-translations.ts");
    assert.match(extra, /View fullscreen card/);
    assert.match(extra, /digital card facing their camera/);
    assert.doesNotMatch(extra, /keep the plate facing/);
  });

  it("17 public profile exposes one main heading", () => {
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(view, /<h1 className="sr-only">\{card\.displayName\}<\/h1>/);
    assert.match(view, /<h2/);
  });

  it("18 desktop guest column becomes a two-column sticky card layout", () => {
    const css = source("src/app/globals.css");
    assert.match(css, /min-width: 1024px/);
    assert.match(css, /grid-template-columns: minmax\(20rem, 24rem\) minmax\(0, 1fr\)/);
    assert.match(css, /position: sticky/);
  });

  it("19 contact rows keep balanced horizontal padding and a visible action", () => {
    const css = source("src/app/globals.css");
    assert.match(css, /padding: var\(--reach-pad-y\) var\(--reach-pad-x\) var\(--reach-pad-y\) calc\(var\(--reach-pad-x\) \+ 0\.12rem\)/);
    assert.match(css, /celecard-reach-go/);
  });

  it("20 long names shrink instead of colliding with the QR", () => {
    const long = "Owuraku Kwame Mensah-Afari-Boateng";
    assert.ok(celecardNameFitCqw(long, false) <= 7);
    assert.ok(celecardNameFitCqw(long, true) <= celecardNameFitCqw("Kojo", true) || celecardNameFitCqw(long, false) < 5);
    const company = celecardCompanyDisplayLines("Aura Group Innovative Holdings International");
    assert.ok(company.join(" ").length >= 10);
  });
});
