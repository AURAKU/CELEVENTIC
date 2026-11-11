import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DigitalCardNfcTapView } from "@/components/digital-business-card/digital-card-nfc-tap-view";
import { peekNfcDeviceCard, resolveNfcDeviceTap } from "@/services/digital-business-card/nfc-device.service";
import { celeYouScanLandingUrl } from "@/lib/digital-business-card/share-identity";
import { DEMO_CARD, DEMO_CARD_SLUG, getDemoCardBySlug, isDemoNfcToken } from "@/lib/digital-business-card/demo-card";
import { celeYouGuestOrigin, getServerAppUrl } from "@/lib/app-url";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";
import { resolveCeleYouPublicShare } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
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
  if (isDemoNfcToken(token)) {
    const demo = getDemoCardBySlug(DEMO_CARD_SLUG) ?? DEMO_CARD;
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
    };
  }
  const card = await peekNfcDeviceCard(token);
  if (!card || card.deletedAt) {
    return { ...withheldCeleCardMetadata(), robots: { index: false, follow: false } };
  }
  const policy = await getCeleCardLifecyclePolicy();
  const presentation = resolveCeleYouPublicShare({ card, channel: "nfc", policy }).presentation;
  if (presentation === "live") {
    return {
      ...buildCeleCardShareMetadata({
        card,
        origin,
        imagePath: digitalCardOgImagePath(card.slug, celeCardShareCacheVersion(card.updatedAt)),
      }),
      robots: { index: false, follow: true },
    };
  }
  if (presentation === "courtesy") {
    return { ...courtesyCeleCardMetadata(card.displayName), robots: { index: false, follow: false } };
  }
  return { ...withheldCeleCardMetadata(), robots: { index: false, follow: false } };
}

/**
 * NFC tap redirect: /n/{token} → paired SmartCard.
 * Tags store only this short URL, never private profile data.
 * Unfurl crawlers receive 200 HTML with OG tags instead of a redirect.
 */
export default async function SmartCardNfcTapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const origin = await getServerAppUrl();
  const unfurl = await isCeleYouUnfurlRequest();
  if (isDemoNfcToken(token)) {
    if (unfurl) return null;
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    redirect(celeYouScanLandingUrl(DEMO_CARD_SLUG, origin));
  }
  if (unfurl) {
    const card = await peekNfcDeviceCard(token);
    if (card && !card.deletedAt) return null;
  }
  const resolved = await resolveNfcDeviceTap(token);
  if (resolved.outcome === "open" || resolved.outcome === "profile") {
    redirect(celeYouScanLandingUrl(resolved.slug, origin));
  }
  return <DigitalCardNfcTapView outcome={resolved.outcome} />;
}
