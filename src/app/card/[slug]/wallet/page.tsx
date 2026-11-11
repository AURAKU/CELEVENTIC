import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { DigitalCardWalletView } from "@/components/digital-business-card/digital-card-wallet-view";
import {
  DEMO_CARD_SLUG,
  getDemoCardBySlug,
  isDemoCardSlug,
} from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouPublicShare, toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { celeCardGrantCookieName } from "@/lib/digital-business-card/privacy";
import {
  buildCeleCardShareMetadata,
  celeCardShareCacheVersion,
  courtesyCeleCardMetadata,
  digitalCardOgImagePath,
  isCeleYouUnfurlRequest,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
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
    if (demo.presentationMode === "courtesy" || !demo.isLive) {
      return courtesyCeleCardMetadata(demo.displayName);
    }
    return {
      ...buildCeleCardShareMetadata({
        card: demo,
        origin,
        imagePath: digitalCardOgImagePath(demo.slug, "card-tile"),
      }),
      robots: { index: false, follow: false },
    };
  }
  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) return withheldCeleCardMetadata();
  const policy = await getCeleCardLifecyclePolicy();
  const presentation = resolveCeleYouPublicShare({ card, channel: "profile", policy }).presentation;
  if (presentation === "live") {
    return {
      ...buildCeleCardShareMetadata({
        card,
        origin,
        imagePath: digitalCardOgImagePath(card.slug, celeCardShareCacheVersion(card.updatedAt)),
      }),
      robots: { index: false, follow: false },
    };
  }
  if (presentation === "courtesy") return courtesyCeleCardMetadata(card.displayName);
  return withheldCeleCardMetadata();
}

export default async function CeleCardWalletPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (isDemoCardSlug(slug) && slug !== DEMO_CARD_SLUG) {
    redirect(`/card/${DEMO_CARD_SLUG}/wallet`);
  }
  const origin = celeYouGuestOrigin(await getServerAppUrl());
  const demo = getDemoCardBySlug(slug);
  if (demo) {
    if (!(await viewerMayOpenDummyLive())) {
      if (await isCeleYouUnfurlRequest()) return null;
      redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    }
    return <DigitalCardWalletView card={demo} origin={origin} />;
  }
  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt) notFound();
  const policy = await getCeleCardLifecyclePolicy();
  const jar = await cookies();
  const grant = await resolveCeleCardGrant(card.id, jar.get(celeCardGrantCookieName(card.id))?.value);
  return (
    <DigitalCardWalletView
      card={toGuestPublicPayload(card, grant?.itemKeys ?? [], policy)}
      origin={origin}
    />
  );
}
