import { NextResponse } from "next/server";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { listEnabledGiftPaymentMethods } from "@/lib/gifts/gift-providers";
import { rateLimit } from "@/lib/rate-limit";
import { resolveInviteGiftCheckout } from "@/services/gifts/resolve-invite-gift-checkout";

export const dynamic = "force-dynamic";

/**
 * Live in-invite Paystack checkout for published invitations and /dev previews.
 *
 * Guests never receive wallet totals. Auto-open follows the same rule as
 * `/invite/{link}`: Aurelia-family gifts sections get an ACTIVE campaign so
 * the form can call `/api/gifts/initialize`.
 */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = await rateLimit(`gift-invite-placement:${ip}`, 40, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const uniqueLink = url.searchParams.get("link");
  const eventId = url.searchParams.get("eventId");
  const guestQrToken = url.searchParams.get("g");

  if (!uniqueLink?.trim() && !eventId?.trim()) {
    return NextResponse.json({ error: "Gift wallet is not available." }, { status: 400 });
  }

  try {
    const checkout = await resolveInviteGiftCheckout({
      uniqueLink,
      eventId,
      guestQrToken,
    });
    if (!checkout) {
      return NextResponse.json({ error: "Gift wallet is not available." }, { status: 404 });
    }

    const payload = {
      giftUrl: checkout.giftUrl,
      qrImageUrl: checkout.qrImageUrl,
      title: checkout.title,
      subtitle: checkout.subtitle,
      ctaLabel: checkout.ctaLabel,
      privacyNote: checkout.privacyNote,
      campaign: checkout.campaign,
      methods: listEnabledGiftPaymentMethods()
        .filter((method) => method.id !== "CARD")
        .map((method) => ({
          id: method.id,
          label: method.label,
          shortLabel: method.shortLabel,
        })),
    };

    assertNoPrivateGiftData(payload, "inviteGiftCheckout");

    return NextResponse.json(
      { success: true, data: payload },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[gifts.invite-placement]", error);
    return NextResponse.json(
      { error: "We could not open Paystack for this invitation." },
      { status: 500 }
    );
  }
}
