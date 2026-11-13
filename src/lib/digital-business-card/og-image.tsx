import { ImageResponse } from "next/og";
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

/** Crawler tile: the captured live plate, cover-fit to 1200×630. Never the site icon. */
export async function livePlateOgFromSnapshot(cardId: string, cacheControl: string): Promise<Response | null> {
  try {
    const buffer = await readLivePlateSnapshotPng(cardId);
    if (!buffer) return null;
    const src = `data:image/png;base64,${buffer.toString("base64")}`;
    const plateHeight = Math.round((CELECARD_OG_WIDTH * 54) / 85.6);
    const png = new ImageResponse(
      (
        <div
          style={{
            width: CELECARD_OG_WIDTH,
            height: CELECARD_OG_HEIGHT,
            display: "flex",
            background: "#0B8A83",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img src={src} width={CELECARD_OG_WIDTH} height={plateHeight} />
        </div>
      ),
      { width: CELECARD_OG_WIDTH, height: CELECARD_OG_HEIGHT }
    );
    png.headers.set("Cache-Control", cacheControl);
    png.headers.set("Content-Type", "image/png");
    return png;
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
    return renderOg({
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
  return renderOg({
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
