import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { giftThemeToCssVars } from "@/lib/gifts/gift-theme";
import { listEnabledGiftPaymentMethods } from "@/lib/gifts/gift-providers";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { sanitizeCompanionReturnUrl } from "@/lib/gifts/gift-placement";
import { GiftExperience } from "@/components/gifts/gift-experience";

/**
 * Guest gift landing page.
 *
 * Rendered per request and never cached: campaign copy, amounts and open/closed
 * state are all organiser-editable and a guest must always see the current
 * version. The page shows no totals, no contributor list and no progress, the
 * only numbers on screen are the amounts this guest may choose from.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}): Promise<Metadata> {
  const { publicToken } = await params;
  const context = await giftCampaignService.getByPublicToken(publicToken);
  if (!context) return { title: "Gift" };

  return {
    title: `${context.campaign.title} · ${context.event.title}`,
    description: context.campaign.subtitle ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function GiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicToken: string }>;
  searchParams: Promise<{ g?: string; return?: string }>;
}) {
  const [{ publicToken }, { g: guestToken, return: returnParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  const context = await giftCampaignService.getByPublicToken(publicToken);
  if (!context) notFound();

  const guest = await giftCampaignService.resolvePersonalisedGuest(
    context.campaign,
    guestToken ?? null
  );
  const campaign = giftCampaignService.toPublicView(context, guest ? { name: guest.name } : null);

  assertNoPrivateGiftData(campaign, "giftPage");

  const companionReturnUrl = sanitizeCompanionReturnUrl(returnParam);

  return (
    <GiftExperience
      campaign={campaign}
      themeVars={giftThemeToCssVars(context.theme)}
      methods={listEnabledGiftPaymentMethods().map((m) => ({
        id: m.id,
        label: m.label,
        shortLabel: m.shortLabel,
        aka: m.aka ?? null,
        channel: m.channel,
        accentClass: m.accentClass,
      }))}
      guestToken={guestToken ?? null}
      companionReturnUrl={companionReturnUrl}
    />
  );
}
