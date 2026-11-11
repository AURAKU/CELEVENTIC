import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { DigitalCardPresentView } from "@/components/digital-business-card/digital-card-present-view";
import {
  DEMO_CARD_SLUG,
  getDemoCardBySlug,
  isDemoCardSlug,
} from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouPublicShare, toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { getSession } from "@/lib/auth";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import {
  buildCeleCardShareMetadata,
  celeCardShareCacheVersion,
  courtesyCeleCardMetadata,
  digitalCardOgImagePath,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { resolveCeleCardGrant } from "@/services/digital-business-card/celecard-access.service";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) return withheldCeleCardMetadata();
    if (demo.presentationMode === "courtesy" || !demo.isLive) {
      return courtesyCeleCardMetadata(demo.displayName);
    }
    return {
      ...buildCeleCardShareMetadata({
        card: demo,
        origin,
        imagePath: digitalCardOgImagePath(demo.slug, "card-tile"),
      }),
      robots: { index: false, follow: true },
      appleWebApp: { capable: true, title: SMARTCARD_PRODUCT_SHORT_NAME, statusBarStyle: "black-translucent" },
    };
  }
  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return withheldCeleCardMetadata();
  const policy = await getCeleCardLifecyclePolicy();
  const presentation = resolveCeleYouPublicShare({ card, channel: "profile", policy }).presentation;
  if (presentation !== "live") {
    return presentation === "courtesy"
      ? courtesyCeleCardMetadata(card.displayName)
      : withheldCeleCardMetadata();
  }
  return {
    ...buildCeleCardShareMetadata({
      card,
      origin,
      imagePath: digitalCardOgImagePath(card.slug, celeCardShareCacheVersion(card.updatedAt)),
    }),
    robots: { index: false, follow: true },
    appleWebApp: { capable: true, title: SMARTCARD_PRODUCT_SHORT_NAME, statusBarStyle: "black-translucent" },
  };
}

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const demo = getDemoCardBySlug(slug);
  const themeId = demo?.themeId ?? (await getDigitalCardBySlug(slug))?.themeId;
  const theme = resolveDigitalCardTheme(themeId);
  const hex = theme.stageBackground.match(/#([0-9a-fA-F]{6})/)?.[0] ?? "#1a1410";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: hex,
  };
}

export default async function CeleCardPresentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ immersive?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (isDemoCardSlug(slug) && slug !== DEMO_CARD_SLUG) {
    redirect(`/card/${DEMO_CARD_SLUG}/present`);
  }

  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const wantImmersive = query.immersive === "1";
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    return <DigitalCardPresentView card={demo} origin={origin} wantImmersive={wantImmersive} />;
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) notFound();
  const policy = await getCeleCardLifecyclePolicy();
  const jar = await cookies();
  const grant = await resolveCeleCardGrant(card.id, jar.get(celeCardGrantCookieName(card.id))?.value);

  const session = await getSession();
  const hostCardId = session?.user?.id && card.userId === session.user.id ? card.id : null;

  return (
    <DigitalCardPresentView
      card={toGuestPublicPayload(card, grant?.itemKeys ?? [], policy)}
      origin={origin}
      wantImmersive={wantImmersive}
      hostCardId={hostCardId}
      proximityDiscoverable={card.proximityDiscoverable !== false}
    />
  );
}
