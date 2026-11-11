import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getDigitalCardByPublicToken,
  recordSmartCardInteraction,
} from "@/services/digital-business-card/digital-business-card.service";
import { resolveCeleYouPublicShare } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { celeYouScanLandingUrl } from "@/lib/digital-business-card/share-identity";
import { DEMO_CARD, DEMO_CARD_SLUG, getDemoCardBySlug, isDemoQrToken } from "@/lib/digital-business-card/demo-card";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";
import {
  buildCeleCardShareMetadata,
  celeCardShareCacheVersion,
  courtesyCeleCardMetadata,
  digitalCardOgImagePath,
  isCeleYouUnfurlRequest,
  withheldCeleCardMetadata,
} from "@/lib/digital-business-card/share";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const origin = celeYouGuestOrigin(await getServerAppUrl());
  if (isDemoQrToken(token)) {
    const demo = getDemoCardBySlug(DEMO_CARD_SLUG) ?? DEMO_CARD;
    if (demo.presentationMode === "courtesy" || !demo.isLive) {
      return courtesyCeleCardMetadata(demo.displayName);
    }
    return buildCeleCardShareMetadata({
      card: demo,
      origin,
      imagePath: digitalCardOgImagePath(demo.slug, "card-tile"),
    });
  }
  const card = await getDigitalCardByPublicToken(token);
  if (!card || card.deletedAt) return withheldCeleCardMetadata();
  const policy = await getCeleCardLifecyclePolicy();
  const presentation = resolveCeleYouPublicShare({ card, channel: "qr", policy }).presentation;
  if (presentation === "live") {
    return buildCeleCardShareMetadata({
      card,
      origin,
      imagePath: digitalCardOgImagePath(card.slug, celeCardShareCacheVersion(card.updatedAt)),
    });
  }
  if (presentation === "courtesy") return courtesyCeleCardMetadata(card.displayName);
  return withheldCeleCardMetadata();
}

/**
 * Smart QR redirect: /c/{publicToken} → /card/{slug}.
 * Token stays stable when the slug or profile details change.
 * Unpublished cards still land on the public page, which withholds private fields.
 * Unfurl crawlers receive 200 HTML with OG tags instead of a redirect.
 */
export default async function SmartCardShortRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const origin = await getServerAppUrl();
  const unfurl = await isCeleYouUnfurlRequest();
  if (isDemoQrToken(token)) {
    if (unfurl) return null;
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    redirect(celeYouScanLandingUrl(DEMO_CARD_SLUG, origin));
  }
  const card = await getDigitalCardByPublicToken(token);
  const share = resolveCeleYouPublicShare({
    card,
    channel: "qr",
    policy: await getCeleCardLifecyclePolicy(),
  });
  if (!share.found || !card) notFound();
  if (unfurl) return null;
  if (share.recordOpen) {
    void recordSmartCardInteraction(card.id, "qr_open").catch(() => undefined);
  }
  redirect(celeYouScanLandingUrl(card.slug, origin));
}
