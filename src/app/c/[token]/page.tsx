import { redirect, notFound } from "next/navigation";
import {
  getDigitalCardByPublicToken,
  recordSmartCardInteraction,
} from "@/services/digital-business-card/digital-business-card.service";
import { resolveCeleYouPublicShare } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { celeYouScanLandingUrl } from "@/lib/digital-business-card/share-identity";
import { DEMO_CARD_SLUG, isDemoQrToken } from "@/lib/digital-business-card/demo-card";
import { getServerAppUrl } from "@/lib/app-url";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

/**
 * Smart QR redirect: /c/{publicToken} → /card/{slug}.
 * Token stays stable when the slug or profile details change.
 * Unpublished cards still land on the public page, which withholds private fields.
 */
export default async function SmartCardShortRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const origin = await getServerAppUrl();
  if (isDemoQrToken(token)) {
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
  if (share.recordOpen) {
    void recordSmartCardInteraction(card.id, "qr_open").catch(() => undefined);
  }
  redirect(celeYouScanLandingUrl(card.slug, origin));
}
