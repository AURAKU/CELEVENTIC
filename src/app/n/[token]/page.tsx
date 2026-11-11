import { redirect } from "next/navigation";
import { DigitalCardNfcTapView } from "@/components/digital-business-card/digital-card-nfc-tap-view";
import { resolveNfcDeviceTap } from "@/services/digital-business-card/nfc-device.service";
import { celeYouScanLandingUrl } from "@/lib/digital-business-card/share-identity";
import { DEMO_CARD_SLUG, isDemoNfcToken } from "@/lib/digital-business-card/demo-card";
import { getServerAppUrl } from "@/lib/app-url";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
  title: "CeleYou NFC",
};

/**
 * NFC tap redirect: /n/{token} → paired SmartCard.
 * Tags store only this short URL, never private profile data.
 */
export default async function SmartCardNfcTapPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const origin = await getServerAppUrl();
  if (isDemoNfcToken(token)) {
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    redirect(celeYouScanLandingUrl(DEMO_CARD_SLUG, origin));
  }
  const resolved = await resolveNfcDeviceTap(token);
  if (resolved.outcome === "open" || resolved.outcome === "profile") {
    redirect(celeYouScanLandingUrl(resolved.slug, origin));
  }
  return <DigitalCardNfcTapView outcome={resolved.outcome} />;
}
