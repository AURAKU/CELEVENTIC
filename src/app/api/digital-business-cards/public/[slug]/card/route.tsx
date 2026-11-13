import { ImageResponse } from "next/og";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDemoCardBySlug, isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { dummyLiveNotFoundResponse } from "@/lib/digital-business-card/demo-live-access";
import { CeleCardExportMarkup } from "@/lib/digital-business-card/card-export-markup";
import { celeCardGuideQrDataUrl, celeCardPlateBitmapAssets, safeCeleCardPhotoSrc } from "@/lib/digital-business-card/og-assets";
import { applyCeleCardDesign, compactCeleCardDesign } from "@/lib/digital-business-card/design";
import {
  CELECARD_EXPORT_HEIGHT,
  CELECARD_EXPORT_WIDTH,
  celeCardReadableQrLabel,
  celeCardStableQrUrl,
} from "@/lib/digital-business-card/share";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import type { CeleCardPortraitFrame } from "@/lib/digital-business-card/portrait-frame";
import { isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { celeYouGuestOrigin, getAppUrlFromEnv } from "@/lib/app-url";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { normalizeSocials } from "@/lib/digital-business-card/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderCard(props: {
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
  filename: string;
  download: boolean;
  cacheControl: string;
}) {
  const png = new ImageResponse(
    (
      <CeleCardExportMarkup
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
    { width: CELECARD_EXPORT_WIDTH, height: CELECARD_EXPORT_HEIGHT }
  );
  png.headers.set("Cache-Control", props.cacheControl);
  png.headers.set("Content-Type", "image/png");
  if (props.download) {
    png.headers.set("Content-Disposition", `attachment; filename="${props.filename}"`);
  }
  return png;
}

async function cardAssets(publicToken: string) {
  const origin = celeYouGuestOrigin(getAppUrlFromEnv());
  const destination = celeCardStableQrUrl(publicToken, origin);
  const qrSrc = await celeCardGuideQrDataUrl(destination, 1024);
  return {
    qrSrc,
    qrLabel: celeCardReadableQrLabel(destination),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = `celecard-${slug.replace(/[^a-z0-9-]+/gi, "") || "card"}.png`;

  if (isDemoCardSlug(slug)) {
    const blocked = await dummyLiveNotFoundResponse();
    if (blocked) return blocked;
    const demo = getDemoCardBySlug(slug);
    if (!demo) return new Response("Not found", { status: 404 });
    const theme = applyCeleCardDesign(resolveDigitalCardTheme(demo.themeId), compactCeleCardDesign(demo.socials.design));
    const [photoSrc, qr, plate] = await Promise.all([
      safeCeleCardPhotoSrc(demo.avatarUrl),
      cardAssets(demo.publicToken),
      celeCardPlateBitmapAssets(demo.socials, theme),
    ]);
    return renderCard({
      displayName: demo.displayName,
      title: demo.title,
      company: demo.company,
      theme,
      photoSrc,
      qrSrc: qr.qrSrc,
      qrLabel: qr.qrLabel,
      portraitFrame: demo.socials.portraitFrame,
      markSrc: plate.markSrc,
      paperSrc: plate.paperSrc,
      companyLogoSrc: plate.companyLogoSrc,
      filename,
      download,
      cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
    });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card) return new Response("Not found", { status: 404 });
  const policy = await getCeleCardLifecyclePolicy();

  if (!isCeleCardPubliclyReachable(card, policy)) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== card.userId) {
      return new Response("Not found", { status: 404 });
    }
  }

  const socials = normalizeSocials(card.socials);
  const theme = applyCeleCardDesign(resolveDigitalCardTheme(card.themeId), compactCeleCardDesign(socials.design));
  const [photoSrc, qr, plate] = await Promise.all([
    safeCeleCardPhotoSrc(card.avatarUrl),
    cardAssets(card.publicToken),
    celeCardPlateBitmapAssets(socials, theme),
  ]);
  return renderCard({
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    theme,
    photoSrc,
    qrSrc: qr.qrSrc,
    qrLabel: qr.qrLabel,
    portraitFrame: socials.portraitFrame,
    markSrc: plate.markSrc,
    paperSrc: plate.paperSrc,
    companyLogoSrc: plate.companyLogoSrc,
    filename,
    download,
    cacheControl: isCeleCardPubliclyReachable(card, policy)
      ? "public, max-age=300, stale-while-revalidate=86400"
      : "private, no-store",
  });
}
