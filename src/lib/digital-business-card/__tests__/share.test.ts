import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCeleCardShareMetadata,
  celeCardShareCacheVersion,
  celeCardShareClipboard,
  celeCardShareDescription,
  celeCardShareMessage,
  celeCardShareTextLeaksPrivate,
  celeCardShareTitle,
  celeCardQrTapPath,
  celeCardReadableQrLabel,
  celeCardStableQrUrl,
  digitalCardExportImagePath,
  digitalCardOgImagePath,
  digitalCardPresentPath,
  courtesyCeleCardMetadata,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";
import { SMARTCARD_BRAND_TAGLINE } from "@/lib/digital-business-card/product";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { DEMO_CARD } from "@/lib/digital-business-card/demo-card";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";

describe("CeleYou share metadata", () => {
  it("builds a personalized title and public description", () => {
    assert.equal(celeCardShareTitle(DEMO_CARD), "Ama Serwaa on CeleYou");
    const description = celeCardShareDescription(DEMO_CARD);
    assert.equal(description, SMARTCARD_BRAND_TAGLINE);
    assert.equal(description.includes(" · "), false);
    assert.equal(description.includes(" - "), false);
    assert.equal(description.includes("This is my CeleYou"), false);
    assert.equal(celeCardShareTextLeaksPrivate(description, DEMO_CARD), false);
    assert.equal(digitalCardPresentPath("ama-serwaa"), "/card/ama-serwaa/present");
    assert.equal(digitalCardPresentPath("ama-serwaa", { immersive: true }), "/card/ama-serwaa/present?immersive=1");
    assert.equal(digitalCardOgImagePath("ama-serwaa", "card-tile"), "/card/ama-serwaa/og?v=card-tile");
    assert.equal(
      celeCardShareMessage(DEMO_CARD),
      "Ama Serwaa on CeleYou. One Identity. Infinite Connections."
    );
    assert.equal(
      celeCardShareClipboard(DEMO_CARD, "https://www.celeventic.com/c/demo-ama-serwaa"),
      "Ama Serwaa on CeleYou. One Identity. Infinite Connections.\nhttps://www.celeventic.com/c/demo-ama-serwaa"
    );
    assert.equal(celeCardQrTapPath("ama-serwaa"), "/card/ama-serwaa");
    assert.equal(celeCardStableQrUrl("demo-ama-serwaa", "https://www.celeventic.com"), "https://www.celeventic.com/c/demo-ama-serwaa");
    assert.equal(celeCardReadableQrLabel("https://www.celeventic.com/c/demo-ama-serwaa"), "celeventic.com/c/demo-ama-serwaa");
    assert.equal(celeCardReadableQrLabel("http://localhost:3000/c/demo-ama-serwaa"), "/c/demo-ama-serwaa");
    assert.match(digitalCardExportImagePath("ama-serwaa"), /\/card\?download=1$/);
  });

  it("keeps phones and emails out of share copy", () => {
    const description = celeCardShareDescription({
      displayName: "Ama Serwaa",
      title: "Creative Director",
      company: "Folio Maison",
      bio: "Call me at +233 24 000 0000 or ama@secret.test",
      email: "ama@secret.test",
      phone: "+233 24 000 0000",
    });
    assert.equal(
      celeCardShareTextLeaksPrivate(description, { email: "ama@secret.test", phone: "+233 24 000 0000" }),
      false
    );
    assert.equal(description.includes("+233"), false);
    assert.equal(description.includes("ama@secret.test"), false);
    const publicCopy = celeCardShareDescription(DEMO_CARD);
    assert.equal(publicCopy.includes(DEMO_CARD.phone || "___"), false);
    assert.equal(publicCopy.includes(DEMO_CARD.email || "___"), false);
  });

  it("emits Open Graph and large Twitter cards for live profiles", () => {
    const metadata = buildCeleCardShareMetadata({
      card: DEMO_CARD,
      origin: "https://www.celeventic.com",
      imagePath: digitalCardOgImagePath(DEMO_CARD.slug, "demo"),
    });
    assert.equal(metadata.openGraph?.url, "https://www.celeventic.com/card/ama-serwaa");
    assert.equal(metadata.alternates?.canonical, "https://www.celeventic.com/card/ama-serwaa");
    assert.equal((metadata.twitter as { card?: string } | undefined)?.card, "summary_large_image");
    assert.equal(metadata.openGraph?.title, "Ama Serwaa on CeleYou");
    assert.equal(metadata.openGraph?.description, SMARTCARD_BRAND_TAGLINE);
    assert.equal(metadata.openGraph?.siteName, "CeleYou");
    const image = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph?.images[0] : metadata.openGraph?.images;
    assert.equal(typeof image === "object" && image && "width" in image ? image.width : 0, 1200);
    assert.equal(typeof image === "object" && image && "height" in image ? image.height : 0, 630);
    assert.match(String(typeof image === "object" && image && "url" in image ? image.url : ""), /\/card\/ama-serwaa\/og\?v=demo/);
    assert.equal(String(metadata.openGraph?.url).includes("localhost"), false);
  });

  it("withholds unpublished cards from social previews", () => {
    const withheld = withheldCeleCardMetadata();
    assert.equal((withheld.robots as { index?: boolean }).index, false);
    assert.equal(withheld.openGraph, undefined);
    assert.equal(String(withheld.description || "").toLowerCase().includes("paid"), false);
    assert.equal(String(withheld.description || "").toLowerCase().includes("expired"), false);
  });

  it("uses limited courtesy metadata without billing language", () => {
    const courtesy = courtesyCeleCardMetadata("Ama Serwaa");
    assert.equal(courtesy.title, "Ama Serwaa · CeleYou");
    assert.match(String(courtesy.description), /temporarily unavailable/);
    assert.equal((courtesy.robots as { index?: boolean }).index, false);
    assert.equal(String(courtesy.description || "").toLowerCase().includes("expired"), false);
    assert.equal(String(courtesy.description || "").toLowerCase().includes("paid"), false);
  });

  it("versions OG paths from updatedAt", () => {
    const at = new Date("2026-11-09T12:00:00.000Z");
    assert.equal(celeCardShareCacheVersion(at), String(at.getTime()));
  });

  it("keeps dummy OG image ungated for crawlers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/digital-business-card/og-image.tsx"), "utf8");
    assert.doesNotMatch(source, /dummyLiveNotFoundResponse|viewerMayOpenDummyLive/);
    assert.match(source, /getDemoCardBySlug/);
    assert.match(source, /CeleCardOgMarkup/);
  });
});

describe("CeleYou QR export", () => {
  it("keeps guide mode and adds svg and download flags", () => {
    const share = "https://www.celeventic.com/c/demo-ama-serwaa";
    const src = digitalCardQrImageSrc(share);
    assert.match(src, /mode=guide/);
    assert.match(src, /size=1024/);
    assert.match(src, /data=https%3A%2F%2Fwww.celeventic.com%2Fc%2Fdemo-ama-serwaa/);
    const svg = digitalCardQrImageSrc(share, { size: 2048, format: "svg", download: true });
    assert.match(svg, /format=svg/);
    assert.match(svg, /size=2048/);
    assert.match(svg, /download=1/);
    const clear = digitalCardQrImageSrc(share, { format: "svg", background: "transparent", download: true });
    assert.match(clear, /bg=transparent/);
    const branded = digitalCardQrImageSrc(share, { variant: "brand", size: 2048, download: true });
    assert.match(branded, /mode=brand/);
  });
});

describe("CeleYou studio share controls", () => {
  it("keeps dummy share on the card tile and drops duplicate copy chips", () => {
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-live-demo-studio.tsx"),
      "utf8"
    );
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    assert.match(studio, /DigitalCardTileActions/);
    assert.doesNotMatch(studio, /Open live page/);
    assert.doesNotMatch(studio, /Copy share link/);
    assert.doesNotMatch(studio, /Copy \$\{demoCardQrPath/);
    assert.doesNotMatch(studio, /Smart share/);
    assert.doesNotMatch(desk, /Share via Apps/);
    assert.doesNotMatch(desk, /Open profile/);
    assert.doesNotMatch(desk, /Download card/);
    assert.match(desk, /Hold up this card/);
  });
});

describe("CeleYou NFC honesty", () => {
  it("does not claim write support on desktop Safari-like agents", () => {
    const result = detectNfcWriteSupport({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
    } as Navigator);
    assert.equal(result.canWrite, false);
  });
});
