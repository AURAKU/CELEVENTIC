import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCeleCardShareMetadata,
  celeCardShareCacheVersion,
  celeCardShareClipboard,
  celeCardShareCommentary,
  celeCardShareDescription,
  celeCardShareMessage,
  celeCardShareTextLeaksPrivate,
  celeCardShareTitle,
  celeCardQrTapPath,
  celeCardReadableQrLabel,
  celeCardStableQrUrl,
  celeCardShareImageUrls,
  CELECARD_PLATE_SHARE_GEN,
  digitalCardExportImagePath,
  digitalCardOgImagePath,
  digitalCardPresentPath,
  courtesyCeleCardMetadata,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { DEMO_CARD } from "@/lib/digital-business-card/demo-card";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";

describe("CeleYou share metadata", () => {
  it("builds a personalized title and public description", () => {
    assert.equal(celeCardShareTitle(DEMO_CARD), "Ama Serwaa on CeleYou");
    const description = celeCardShareDescription(DEMO_CARD);
    assert.equal(description, celeCardShareCommentary(DEMO_CARD));
    assert.equal(description, "Meet Ama Serwaa, Creative Director at Folio Maison. Their live CeleYou plate.");
    assert.equal(description.includes(" · "), false);
    assert.equal(description.includes(" - "), false);
    assert.equal(description.includes("This is my CeleYou"), false);
    assert.equal(celeCardShareTextLeaksPrivate(description, DEMO_CARD), false);
    assert.equal(digitalCardPresentPath("ama-serwaa"), "/card/ama-serwaa/present");
    assert.equal(digitalCardPresentPath("ama-serwaa", { immersive: true }), "/card/ama-serwaa/present?immersive=1");
    assert.equal(digitalCardOgImagePath("ama-serwaa", "card-tile"), "/card/ama-serwaa/og?v=card-tile");
    assert.equal(
      celeCardShareMessage(DEMO_CARD),
      "Meet Ama Serwaa, Creative Director at Folio Maison. Their live CeleYou plate."
    );
    assert.equal(
      celeCardShareMessage(DEMO_CARD, "https://www.celeventic.com/u/ama-serwaa"),
      "Meet Ama Serwaa, Creative Director at Folio Maison. Their live CeleYou plate.\nhttps://www.celeventic.com/u/ama-serwaa"
    );
    assert.equal(
      celeCardShareClipboard(DEMO_CARD, "https://www.celeventic.com/c/demo-ama-serwaa"),
      "Meet Ama Serwaa, Creative Director at Folio Maison. Their live CeleYou plate.\nhttps://www.celeventic.com/c/demo-ama-serwaa"
    );
    assert.equal(
      celeCardShareCommentary({ displayName: "Kojo Mensah" }),
      "Meet Kojo Mensah. Their live CeleYou plate."
    );
    assert.equal(celeCardQrTapPath("ama-serwaa"), "/card/ama-serwaa");
    assert.equal(celeCardStableQrUrl("demo-ama-serwaa", "https://www.celeventic.com"), "https://www.celeventic.com/c/demo-ama-serwaa");
    assert.equal(celeCardReadableQrLabel("https://www.celeventic.com/c/demo-ama-serwaa"), "celeventic.com/c/demo-ama-serwaa");
    assert.equal(celeCardReadableQrLabel("http://localhost:3000/c/demo-ama-serwaa"), "/c/demo-ama-serwaa");
    assert.match(digitalCardExportImagePath("ama-serwaa"), /\/card\?download=1$/);
    assert.deepEqual(celeCardShareImageUrls("ama-serwaa", "demo"), [
      digitalCardExportImagePath("ama-serwaa", `${CELECARD_PLATE_SHARE_GEN}-demo`),
      digitalCardOgImagePath("ama-serwaa", `${CELECARD_PLATE_SHARE_GEN}-demo`),
    ]);
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
    assert.equal(metadata.openGraph?.description, celeCardShareCommentary(DEMO_CARD));
    assert.equal(metadata.openGraph?.siteName, "CeleYou");
    assert.equal(metadata.openGraph?.type, "website");
    const image = Array.isArray(metadata.openGraph?.images) ? metadata.openGraph?.images[0] : metadata.openGraph?.images;
    assert.equal(typeof image === "object" && image && "width" in image ? image.width : 0, 1200);
    assert.equal(typeof image === "object" && image && "height" in image ? image.height : 0, 630);
    assert.match(String(typeof image === "object" && image && "url" in image ? image.url : ""), /\/card\/ama-serwaa\/og\?v=demo/);
    assert.equal(typeof image === "object" && image && "type" in image ? image.type : "", "image/png");
    assert.equal(String(metadata.openGraph?.url).includes("localhost"), false);
    const icons = metadata.icons && typeof metadata.icons === "object" && "icon" in metadata.icons ? metadata.icons : null;
    const iconList = icons && "icon" in icons ? icons.icon : undefined;
    const iconUrl = Array.isArray(iconList) ? iconList[0] : iconList;
    const iconHref = typeof iconUrl === "object" && iconUrl && "url" in iconUrl ? String(iconUrl.url) : String(iconUrl || "");
    assert.match(iconHref, /\/card\/ama-serwaa\/og\?v=demo/);
    assert.equal(iconHref.includes("/brand/icon.png"), false);
    assert.equal(iconHref.includes("/icon.png"), false);
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

  it("does not let Satori load remote images or CSS inset on the plate bitmap", () => {
    const overlay = readFileSync(join(process.cwd(), "src/lib/digital-business-card/qr-center-overlay.tsx"), "utf8");
    const plate = readFileSync(join(process.cwd(), "src/lib/digital-business-card/plate-bitmap.tsx"), "utf8");
    const assets = readFileSync(join(process.cwd(), "src/lib/digital-business-card/og-assets.ts"), "utf8");
    const pages = readFileSync(join(process.cwd(), "src/app/card/[slug]/page.tsx"), "utf8");
    assert.match(overlay, /data:image\//);
    assert.doesNotMatch(overlay, /CELEYOU_MARK_SRC/);
    assert.doesNotMatch(plate, /inset:/);
    assert.match(assets, /Always a data URL/);
    assert.match(pages, /celeCardPageOgPath/);
    assert.match(pages, /presentation === "courtesy"/);
  });

  it("keeps dummy OG image ungated for crawlers", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/digital-business-card/og-image.tsx"), "utf8");
    assert.doesNotMatch(source, /dummyLiveNotFoundResponse|viewerMayOpenDummyLive/);
    assert.match(source, /getDemoCardBySlug/);
    assert.match(source, /CeleCardOgMarkup/);
    assert.match(source, /applyCeleCardDesign/);
    assert.match(source, /paperSrc/);
    assert.match(source, /companyLogoSrc/);
  });

  it("renders only the live ID-1 plate on the share tile", () => {
    const markup = readFileSync(join(process.cwd(), "src/lib/digital-business-card/og-markup.tsx"), "utf8");
    const bitmap = readFileSync(join(process.cwd(), "src/lib/digital-business-card/plate-bitmap.tsx"), "utf8");
    const assets = readFileSync(join(process.cwd(), "src/lib/digital-business-card/og-assets.ts"), "utf8");
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    const ogRoute = readFileSync(join(process.cwd(), "src/app/card/[slug]/og/route.tsx"), "utf8");
    const engine = readFileSync(join(process.cwd(), "src/lib/celeyou-share/engine.ts"), "utf8");
    assert.match(markup, /the full ID-1 plate/);
    assert.match(markup, /contain/);
    assert.doesNotMatch(markup, /\n\s+cover\s*\n/);
    assert.match(bitmap, /background: "#ffffff"/);
    assert.match(bitmap, /paperSrc/);
    assert.match(bitmap, /isEmbeddedImage\(markSrc\)/);
    assert.match(bitmap, /containPlateSize/);
    assert.doesNotMatch(bitmap, /logo-full\.png|brand\/icon\.png|celeventic-logo/i);
    assert.doesNotMatch(bitmap, /\bright:\s|\bbottom:\s/);
    assert.doesNotMatch(markup, /Open this CeleYou|Download this card|Share this card/);
    assert.match(assets, /\/smartcard\//);
    assert.match(assets, /Never a remote URL/);
    assert.match(config, /source: "\/u\/:slug\/og"/);
    assert.match(ogRoute, /export async function HEAD/);
    assert.match(engine, /files: \[file\]/);
    assert.match(engine, /celeyou-plate\.png/);
    assert.match(engine, /captureLivePlateFile/);
    assert.match(engine, /persistLivePlateSnapshot/);
    const face = readFileSync(join(process.cwd(), "src/components/digital-business-card/digital-card-face.tsx"), "utf8");
    const capture = readFileSync(join(process.cwd(), "src/lib/digital-business-card/capture-live-plate.ts"), "utf8");
    const ogImage = readFileSync(join(process.cwd(), "src/lib/digital-business-card/og-image.tsx"), "utf8");
    const wallet = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-wallet-view.tsx"),
      "utf8"
    );
    assert.match(face, /data-celeyou-live-plate="true"/);
    assert.match(capture, /html-to-image/);
    assert.match(capture, /flattenLivePlate/);
    assert.match(capture, /CELEYOU_PLATE_FILE_NAME/);
    assert.match(ogImage, /livePlateOgFromSnapshot/);
    assert.match(ogImage, /readLivePlateSnapshotPng/);
    assert.match(wallet, /capturePlate: false/);
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
  it("keeps share on the Share desk and drops duplicate tile overlays", () => {
    const studio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-live-demo-studio.tsx"),
      "utf8"
    );
    const ownerStudio = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-studio-client.tsx"),
      "utf8"
    );
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/digital-card-share-desk.tsx"),
      "utf8"
    );
    assert.doesNotMatch(studio, /DigitalCardTileActions/);
    assert.doesNotMatch(ownerStudio, /DigitalCardTileActions/);
    assert.doesNotMatch(ownerStudio, /Share this card/);
    assert.doesNotMatch(ownerStudio, /Download this card/);
    assert.doesNotMatch(studio, /Open live page/);
    assert.doesNotMatch(studio, /Copy share link/);
    assert.doesNotMatch(studio, /Copy \$\{demoCardQrPath/);
    assert.doesNotMatch(studio, /Smart share/);
    assert.doesNotMatch(desk, /Open profile/);
    assert.doesNotMatch(desk, /Download card/);
    assert.match(desk, /Hold up this card/);
    assert.match(desk, /SHARE_MY_CARD_CTA/);
    assert.doesNotMatch(desk, /NEARBY_SHARE_CTA/);
    assert.match(desk, /COPY_PROFILE_LINK_CTA/);
    assert.match(desk, /SAVE_CONTACT_CTA/);
    assert.doesNotMatch(desk, /SHARE_CONTACT_FILE_CTA/);
    assert.match(desk, /CeleYouNameDropSetup/);
    assert.doesNotMatch(desk, />NFC Card</);
    assert.match(desk, /Open Tap studio/);
    assert.doesNotMatch(desk, /SHARE_VIA_APPS_CTA/);
    assert.doesNotMatch(desk, /SHOW_QR_CTA/);
    assert.match(desk, /CeleYouSmartShareEngine/);
    assert.match(desk, /WALLET_PASS_CTA/);
    assert.match(desk, /celeCardShareImageUrls/);
    assert.match(desk, /imageUrl/);
    assert.match(desk, /persistPlateCardId/);
    assert.match(desk, /usePersistLivePlateSnapshot/);
    assert.match(desk, /identityShare/);
    assert.doesNotMatch(desk, /same public profile/);
    assert.doesNotMatch(desk, /start AirDrop by NFC|automatic phone to phone NFC/i);
    assert.doesNotMatch(desk, /Phone to phone NFC is not used/);
    assert.doesNotMatch(desk, /Chrome on Android only/);
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
