import { ImageResponse } from "next/og";
import { getDemoCardBySlug } from "@/lib/digital-business-card/demo-card";
import { CeleCardOgMarkup } from "@/lib/digital-business-card/og-markup";
import { celeCardGuideQrDataUrl, localCeleCardPhotoDataUrl, safeCeleCardPhotoSrc } from "@/lib/digital-business-card/og-assets";
import {
  CELECARD_OG_HEIGHT,
  CELECARD_OG_WIDTH,
  celeCardReadableQrLabel,
  celeCardStableQrUrl,
} from "@/lib/digital-business-card/share";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { isCeleCardCourtesyReachable, isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { celeYouGuestOrigin, getAppUrlFromEnv } from "@/lib/app-url";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { normalizeSocials } from "@/lib/digital-business-card/types";
import type { CeleCardPortraitFrame } from "@/lib/digital-business-card/portrait-frame";

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
      />
    ),
    { width: CELECARD_OG_WIDTH, height: CELECARD_OG_HEIGHT }
  );
  png.headers.set("Cache-Control", props.cacheControl);
  png.headers.set("Content-Type", "image/png");
  return png;
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

function celeYouMark() {
  return localCeleCardPhotoDataUrl("/digital-cards/brands/celeyou-mark.png");
}

/**
 * 1200×630 WhatsApp / iMessage / LinkedIn / X tile. ID-1 plate only.
 * Dummy Gold Folio always returns 200 even when HTML is admin-gated.
 */
export async function renderCeleCardOgBySlug(slug: string): Promise<Response> {
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    const theme = resolveDigitalCardTheme(demo.themeId);
    if (!demo.isLive || demo.presentationMode === "courtesy") {
      const [photoSrc, markSrc] = await Promise.all([safeCeleCardPhotoSrc(demo.avatarUrl), celeYouMark()]);
      return renderOg({
        displayName: demo.displayName,
        title: demo.title,
        company: demo.company,
        theme,
        photoSrc,
        qrSrc: null,
        qrLabel: null,
        portraitFrame: demo.socials.portraitFrame ?? null,
        markSrc,
        cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
      });
    }
    const [photoSrc, qr, markSrc] = await Promise.all([
      safeCeleCardPhotoSrc(demo.avatarUrl),
      previewAssets(demo.publicToken),
      celeYouMark(),
    ]);
    return renderOg({
      displayName: demo.displayName,
      title: demo.title,
      company: demo.company,
      theme,
      photoSrc,
      qrSrc: qr.qrSrc,
      qrLabel: qr.qrLabel,
      portraitFrame: demo.socials.portraitFrame ?? null,
      markSrc,
      cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
    });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return new Response("Not found", { status: 404 });
  const policy = await getCeleCardLifecyclePolicy();
  if (isCeleCardCourtesyReachable(card, policy)) {
    const theme = resolveDigitalCardTheme(card.themeId);
    const [photoSrc, markSrc] = await Promise.all([safeCeleCardPhotoSrc(card.avatarUrl), celeYouMark()]);
    return renderOg({
      displayName: card.displayName,
      title: card.title,
      company: card.company,
      theme,
      photoSrc,
      qrSrc: null,
      qrLabel: null,
      portraitFrame: normalizeSocials(card.socials).portraitFrame ?? null,
      markSrc,
      cacheControl: "private, no-store",
    });
  }
  if (!isCeleCardPubliclyReachable(card, policy)) {
    return new Response("Not found", { status: 404 });
  }

  const theme = resolveDigitalCardTheme(card.themeId);
  const [photoSrc, qr, markSrc] = await Promise.all([
    safeCeleCardPhotoSrc(card.avatarUrl),
    previewAssets(card.publicToken),
    celeYouMark(),
  ]);
  return renderOg({
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    theme,
    photoSrc,
    qrSrc: qr.qrSrc,
    qrLabel: qr.qrLabel,
    portraitFrame: normalizeSocials(card.socials).portraitFrame ?? null,
    markSrc,
    cacheControl: "public, max-age=300, stale-while-revalidate=86400",
  });
}
