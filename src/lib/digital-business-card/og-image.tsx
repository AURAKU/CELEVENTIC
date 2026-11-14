import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getDemoCardBySlug } from "@/lib/digital-business-card/demo-card";
import { CeleCardOgMarkup } from "@/lib/digital-business-card/og-markup";
import { celeCardGuideQrDataUrl, celeCardPlateBitmapAssets, safeCeleCardPhotoSrc } from "@/lib/digital-business-card/og-assets";
import {
  CELECARD_OG_HEIGHT,
  CELECARD_OG_WIDTH,
  celeCardReadableQrLabel,
  celeCardStableQrUrl,
} from "@/lib/digital-business-card/share";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { applyCeleCardDesign, compactCeleCardDesign } from "@/lib/digital-business-card/design";
import { isCeleCardCourtesyReachable, isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { celeYouGuestOrigin, getAppUrlFromEnv } from "@/lib/app-url";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { normalizeSocials } from "@/lib/digital-business-card/types";
import type { CeleCardPortraitFrame } from "@/lib/digital-business-card/portrait-frame";
import {
  livePlateSnapshotResponse,
  readLivePlateSnapshotPng,
} from "@/lib/digital-business-card/live-plate-server";

function renderOg(props: {
  displayName: string;
  title?: string | null;
  company?: string | null;
  theme: ReturnType<typeof resolveDigitalCardTheme>;
  photoSrc?: string | null;
  qrSrc?: string | null;
  qrLabel?: string | null;
  portraitFrame?: CeleCardPortraitFrame | null;
  markSrc?: string | null;
  paperSrc?: string | null;
  companyLogoSrc?: string | null;
  cacheControl: string;
}) {
  const png = new ImageResponse(
    (
      <CeleCardOgMarkup
        displayName={props.displayName}
        title={props.title}
        company={props.company}
        theme={props.theme}
        photoSrc={props.photoSrc}
        qrSrc={props.qrSrc}
        qrLabel={props.qrLabel}
        portraitFrame={props.portraitFrame}
        markSrc={props.markSrc}
        paperSrc={props.paperSrc}
        companyLogoSrc={props.companyLogoSrc}
      />
    ),
    { width: CELECARD_OG_WIDTH, height: CELECARD_OG_HEIGHT }
  );
  png.headers.set("Cache-Control", props.cacheControl);
  png.headers.set("Content-Type", "image/png");
  return png;
}

type OgRenderProps = Parameters<typeof renderOg>[0];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function solidThemeFill(background: string) {
  const hex = background.match(/#(?:[0-9a-fA-F]{3,8})/);
  return hex?.[0] || "#0B8A83";
}

async function pngResponse(buffer: Buffer, cacheControl: string) {
  let body = buffer;
  let type = "image/png";
  try {
    const jpeg = await sharp(buffer).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    if (jpeg.length > 64 && jpeg.length < buffer.length) {
      body = jpeg;
      type = "image/jpeg";
    }
  } catch {
    /* keep png */
  }
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Cache-Control": cacheControl,
    },
  });
}

async function renderSharpPlateFallback(props: OgRenderProps): Promise<Response> {
  const fill = solidThemeFill(props.theme.cardBackground);
  const accent = props.theme.accent || "#0B8A83";
  const name = escapeXml(props.displayName.trim() || "CeleYou");
  const title = escapeXml(props.title?.trim() || "");
  const company = escapeXml(props.company?.trim() || "");
  const plateW = Math.round(CELECARD_OG_HEIGHT * (85.6 / 54));
  const plateX = Math.round((CELECARD_OG_WIDTH - plateW) / 2);
  const svg = `<svg width="${CELECARD_OG_WIDTH}" height="${CELECARD_OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#0B8A83"/>
    <rect x="${plateX}" y="0" width="${plateW}" height="630" rx="28" fill="${fill}"/>
    <text x="${plateX + 280}" y="280" font-size="44" font-weight="700" fill="${accent}" font-family="sans-serif">${name}</text>
    ${title ? `<text x="${plateX + 280}" y="330" font-size="24" fill="#475569" font-family="sans-serif">${title}</text>` : ""}
    ${company ? `<text x="${plateX + 280}" y="372" font-size="20" fill="${accent}" font-family="sans-serif">${company}</text>` : ""}
  </svg>`;
  let image = sharp(Buffer.from(svg));
  const photoRaw = props.photoSrc?.startsWith("data:image/")
    ? Buffer.from(props.photoSrc.slice(props.photoSrc.indexOf(",") + 1), "base64")
    : null;
  if (photoRaw && photoRaw.length > 64) {
    try {
      const photo = await sharp(photoRaw).resize(168, 168, { fit: "cover" }).png().toBuffer();
      image = image.composite([{ input: photo, left: plateX + 56, top: 231 }]);
    } catch {
      /* keep the name plate */
    }
  }
  return pngResponse(await image.png({ compressionLevel: 9 }).toBuffer(), props.cacheControl);
}

async function renderOgSafe(props: OgRenderProps): Promise<Response> {
  try {
    const png = renderOg(props);
    const buffer = Buffer.from(await png.arrayBuffer());
    if (buffer.length < 64 || buffer[0] !== 0x89) throw new Error("empty og png");
    return await pngResponse(buffer, props.cacheControl);
  } catch {
    return renderSharpPlateFallback(props);
  }
}

/** Crawler tile: the captured live plate, cover-fit to 1200×630. Never the site icon. */
export async function livePlateOgFromSnapshot(cardId: string, cacheControl: string): Promise<Response | null> {
  const buffer = await readLivePlateSnapshotPng(cardId);
  if (!buffer) return null;
  try {
    const framed = await sharp(buffer)
      .rotate()
      .resize(CELECARD_OG_WIDTH, CELECARD_OG_HEIGHT, {
        fit: "contain",
        background: { r: 11, g: 138, b: 131, alpha: 1 },
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return pngResponse(framed, cacheControl);
  } catch {
    return livePlateSnapshotResponse(cardId, cacheControl);
  }
}

async function previewAssets(publicToken: string) {
  const origin = celeYouGuestOrigin(getAppUrlFromEnv());
  const destination = celeCardStableQrUrl(publicToken, origin);
  const qrSrc = await celeCardGuideQrDataUrl(destination, 512);
  return {
    qrSrc,
    qrLabel: celeCardReadableQrLabel(destination),
  };
}

/**
 * 1200×630 WhatsApp / iMessage / LinkedIn / X tile. ID-1 plate only.
 * Dummy Gold Folio always returns 200 even when HTML is admin-gated.
 */
export async function renderCeleCardOgBySlug(slug: string): Promise<Response> {
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    const socials = demo.socials;
    const theme = applyCeleCardDesign(resolveDigitalCardTheme(demo.themeId), compactCeleCardDesign(socials.design));
    const live = demo.isLive && demo.presentationMode !== "courtesy";
    const [photoSrc, qr, plate] = await Promise.all([
      safeCeleCardPhotoSrc(demo.avatarUrl),
      live ? previewAssets(demo.publicToken) : Promise.resolve({ qrSrc: null as string | null, qrLabel: null as string | null }),
      celeCardPlateBitmapAssets(socials, theme),
    ]);
    return renderOgSafe({
      displayName: demo.displayName,
      title: demo.title,
      company: demo.company,
      theme,
      photoSrc,
      qrSrc: qr.qrSrc,
      qrLabel: qr.qrLabel,
      portraitFrame: socials.portraitFrame ?? null,
      markSrc: plate.markSrc,
      paperSrc: plate.paperSrc,
      companyLogoSrc: plate.companyLogoSrc,
      cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
    });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return new Response("Not found", { status: 404 });
  const policy = await getCeleCardLifecyclePolicy();
  const courtesy = isCeleCardCourtesyReachable(card, policy);
  if (!courtesy && !isCeleCardPubliclyReachable(card, policy)) {
    return new Response("Not found", { status: 404 });
  }

  const snapshot = await livePlateOgFromSnapshot(
    card.id,
    courtesy ? "private, no-store" : "public, max-age=60, stale-while-revalidate=86400"
  );
  if (snapshot) return snapshot;

  const socials = normalizeSocials(card.socials);
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), compactCeleCardDesign(socials.design));
  const [photoSrc, qr, plate] = await Promise.all([
    safeCeleCardPhotoSrc(card.avatarUrl),
    courtesy ? Promise.resolve({ qrSrc: null as string | null, qrLabel: null as string | null }) : previewAssets(card.publicToken),
    celeCardPlateBitmapAssets(socials, theme),
  ]);
  return renderOgSafe({
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    theme,
    photoSrc,
    qrSrc: qr.qrSrc,
    qrLabel: qr.qrLabel,
    portraitFrame: socials.portraitFrame ?? null,
    markSrc: plate.markSrc,
    paperSrc: plate.paperSrc,
    companyLogoSrc: plate.companyLogoSrc,
    cacheControl: courtesy ? "private, no-store" : "public, max-age=300, stale-while-revalidate=86400",
  });
}
