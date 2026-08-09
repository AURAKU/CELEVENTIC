import { NextResponse } from "next/server";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { assertGuestGiftPaymentsAllowed } from "@/lib/gifts/gift-guest-access";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { giftThemeToCssVars } from "@/lib/gifts/gift-theme";
import { listEnabledGiftPaymentMethods } from "@/lib/gifts/gift-providers";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public gift landing payload.
 *
 * Everything a guest needs to send a gift and nothing about anybody else's:
 * no totals, no counts, no contributor list, no progress bar. The
 * `assertNoPrivateGiftData` call is the last line of defence before the JSON
 * leaves the server. When GIFT_WALLET is off for the event, this returns 404.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = await rateLimit(`gift-campaign:${ip}`, 60, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const context = await giftCampaignService.getByPublicToken(publicToken);
  if (!context) {
    return NextResponse.json({ error: "This gift link is not available" }, { status: 404 });
  }

  const access = await assertGuestGiftPaymentsAllowed(context.event.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const guestToken = new URL(req.url).searchParams.get("g");
  const guest = await giftCampaignService.resolvePersonalisedGuest(context.campaign, guestToken);

  const campaign = giftCampaignService.toPublicView(
    context,
    guest ? { name: guest.name } : null
  );

  const payload = {
    campaign,
    theme: context.theme,
    themeVars: giftThemeToCssVars(context.theme),
    methods: listEnabledGiftPaymentMethods().map((m) => ({
      id: m.id,
      label: m.label,
      shortLabel: m.shortLabel,
      aka: m.aka ?? null,
      channel: m.channel,
      accentClass: m.accentClass,
    })),
  };

  assertNoPrivateGiftData(payload, "giftCampaign");

  return NextResponse.json(
    { success: true, data: payload },
    { headers: { "Cache-Control": "no-store" } }
  );
}
