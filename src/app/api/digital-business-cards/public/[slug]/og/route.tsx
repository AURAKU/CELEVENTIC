import { ImageResponse } from "next/og";
import { getDemoCardBySlug } from "@/lib/digital-business-card/demo-card";
import { CeleCardOgMarkup } from "@/lib/digital-business-card/og-markup";
import { celeCardGuideQrDataUrl, safeCeleCardPhotoSrc } from "@/lib/digital-business-card/og-assets";
import {
  CELECARD_OG_HEIGHT,
  CELECARD_OG_WIDTH,
  celeCardReadableQrLabel,
  celeCardStableQrUrl,
} from "@/lib/digital-business-card/share";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { isCeleCardCourtesyReachable, isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { normalizeSocials } from "@/lib/digital-business-card/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

function renderOg(props: {
  displayName: string;
  title?: string | null;
  company?: string | null;
  theme: ReturnType<typeof resolveDigitalCardTheme>;
  photoSrc?: string | null;
  qrSrc?: string | null;
  qrLabel?: string | null;
  portraitFrame?: "circle" | "square" | "rounded" | null;
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
      />
    ),
    { width: CELECARD_OG_WIDTH, height: CELECARD_OG_HEIGHT }
  );
  png.headers.set("Cache-Control", props.cacheControl);
  png.headers.set("Content-Type", "image/png");
  return png;
}

async function previewAssets(publicToken: string) {
  const origin = getAppUrlFromEnv();
  const destination = celeCardStableQrUrl(publicToken, origin);
  const qrSrc = await celeCardGuideQrDataUrl(destination, 512);
  return {
    qrSrc,
    qrLabel: celeCardReadableQrLabel(destination),
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const demo = getDemoCardBySlug(slug);
  if (demo) {
    const theme = resolveDigitalCardTheme(demo.themeId);
    if (!demo.isLive || demo.presentationMode === "courtesy") {
      const photoSrc = await safeCeleCardPhotoSrc(demo.avatarUrl);
      return renderOg({
        displayName: demo.displayName,
        title: demo.title,
        company: demo.company,
        theme,
        photoSrc,
        qrSrc: null,
        qrLabel: null,
        portraitFrame: demo.socials.portraitFrame,
        cacheControl: "private, no-store",
      });
    }
    const [photoSrc, qr] = await Promise.all([safeCeleCardPhotoSrc(demo.avatarUrl), previewAssets(demo.publicToken)]);
    return renderOg({
      displayName: demo.displayName,
      title: demo.title,
      company: demo.company,
      theme,
      photoSrc,
      qrSrc: qr.qrSrc,
      qrLabel: qr.qrLabel,
      portraitFrame: demo.socials.portraitFrame,
      cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
    });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return new Response("Not found", { status: 404 });
  if (isCeleCardCourtesyReachable(card)) {
    const theme = resolveDigitalCardTheme(card.themeId);
    const photoSrc = await safeCeleCardPhotoSrc(card.avatarUrl);
    return renderOg({
      displayName: card.displayName,
      title: card.title,
      company: card.company,
      theme,
      photoSrc,
      qrSrc: null,
      qrLabel: null,
      portraitFrame: normalizeSocials(card.socials).portraitFrame,
      cacheControl: "private, no-store",
    });
  }
  if (!isCeleCardPubliclyReachable(card)) {
    return new Response("Not found", { status: 404 });
  }

  const theme = resolveDigitalCardTheme(card.themeId);
  const [photoSrc, qr] = await Promise.all([safeCeleCardPhotoSrc(card.avatarUrl), previewAssets(card.publicToken)]);
  return renderOg({
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    theme,
    photoSrc,
    qrSrc: qr.qrSrc,
    qrLabel: qr.qrLabel,
    portraitFrame: normalizeSocials(card.socials).portraitFrame,
    cacheControl: "public, max-age=300, stale-while-revalidate=86400",
  });
}
