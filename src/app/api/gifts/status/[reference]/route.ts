import { NextResponse } from "next/server";
import { giftPaymentService } from "@/services/gifts/gift-payment.service";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { getServerAppUrl } from "@/lib/app-url";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Status of one gift, by reference.
 *
 * The guest's pending screen polls this. Knowing a reference proves nothing
 * about the event, so the payload is scoped hard to that single payment — and
 * it only ever reports success once the server has confirmed it with the
 * provider.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = await rateLimit(`gift-status:${ip}`, 120, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const gift = await giftPaymentService.findByReference(reference);
  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  const campaign = await giftCampaignService.getByEvent(gift.eventId);
  const baseUrl = await getServerAppUrl();
  const view = await giftPaymentService.toPublicView(gift, {
    publicToken: campaign?.publicToken ?? "",
    baseUrl,
  });

  assertNoPrivateGiftData(view, "giftStatus");

  return NextResponse.json(
    { success: true, data: view },
    { headers: { "Cache-Control": "no-store" } }
  );
}
