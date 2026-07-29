import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { giftPaymentService } from "@/services/gifts/gift-payment.service";
import { giftThemeToCssVars } from "@/lib/gifts/gift-theme";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { resolveGiftCopy } from "@/lib/gifts/gift-copy";
import { getServerAppUrl } from "@/lib/app-url";
import { GiftStatusScreen } from "@/components/gifts/gift-status-screen";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your gift",
  robots: { index: false, follow: false },
};

/**
 * Where the provider sends the guest back to. We do one server-side
 * verification here so the common case (payment already settled) paints as
 * confirmed on first render, then hand over to the client to keep checking.
 */
export default async function GiftStatusPage({
  params,
}: {
  params: Promise<{ publicToken: string; reference: string }>;
}) {
  const { publicToken, reference } = await params;

  const context = await giftCampaignService.getByPublicToken(publicToken);
  if (!context) notFound();

  let gift = await giftPaymentService.findByReference(reference);
  if (!gift || gift.eventId !== context.event.id) notFound();

  if (gift.status === "PENDING" || gift.status === "PROCESSING") {
    try {
      const result = await giftPaymentService.fulfilFromProvider(reference, "guest_verify");
      gift = result.gift;
    } catch {
      // Provider unreachable or still processing, the client keeps polling.
    }
  }

  const baseUrl = await getServerAppUrl();
  const view = await giftPaymentService.toPublicView(gift, { publicToken, baseUrl });
  assertNoPrivateGiftData(view, "giftStatusPage");

  const copy = resolveGiftCopy(context.campaign.giftType, context.campaign);

  return (
    <GiftStatusScreen
      reference={reference}
      publicToken={publicToken}
      initial={view}
      themeVars={giftThemeToCssVars(context.theme)}
      thankYou={{ title: copy.thankYouTitle, message: copy.thankYouMessage }}
      eventTitle={context.event.title}
      hostName={context.event.hostName}
    />
  );
}
