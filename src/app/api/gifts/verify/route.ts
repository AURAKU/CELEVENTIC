import { NextResponse } from "next/server";
import { z } from "zod";
import { giftPaymentService, GiftPaymentError } from "@/services/gifts/gift-payment.service";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { getServerAppUrl } from "@/lib/app-url";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ reference: z.string().min(8).max(128) });

/**
 * Guest-triggered verification.
 *
 * When a guest lands back on our status page we ask Paystack directly rather
 * than trusting the redirect. Webhooks remain the primary path; this exists so
 * a guest whose webhook is delayed still sees the truth within a second or two,
 * and both paths converge on the same idempotent credit.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = await rateLimit(`gift-verify:${ip}`, 30, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { reference } = schema.parse(await req.json());
    const { gift } = await giftPaymentService.fulfilFromProvider(reference, "guest_verify");

    const campaign = await giftCampaignService.getByEvent(gift.eventId);
    const baseUrl = await getServerAppUrl();
    const view = await giftPaymentService.toPublicView(gift, {
      publicToken: campaign?.publicToken ?? "",
      baseUrl,
    });

    assertNoPrivateGiftData(view, "giftVerify");
    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof GiftPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gifts.verify]", error);
    return NextResponse.json({ error: "We could not verify this gift yet" }, { status: 502 });
  }
}
