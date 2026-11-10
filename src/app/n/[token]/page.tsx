import { redirect } from "next/navigation";
import { DigitalCardNfcTapView } from "@/components/digital-business-card/digital-card-nfc-tap-view";
import { resolveNfcDeviceTap } from "@/services/digital-business-card/nfc-device.service";
import { DIGITAL_CARD_PUBLIC_PATH } from "@/lib/digital-business-card/types";
import { demoCardGuestPath, isDemoNfcToken } from "@/lib/digital-business-card/demo-card";
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
  if (isDemoNfcToken(token)) {
    if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
    redirect(demoCardGuestPath());
  }
  const resolved = await resolveNfcDeviceTap(token);
  if (resolved.outcome === "open" || resolved.outcome === "profile") {
    redirect(`${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(resolved.slug)}`);
  }
  return <DigitalCardNfcTapView outcome={resolved.outcome} />;
}
