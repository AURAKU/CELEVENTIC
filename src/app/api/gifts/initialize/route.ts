import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { giftPaymentService, GiftPaymentError } from "@/services/gifts/gift-payment.service";
import { GIFT_PAYMENT_METHOD_IDS } from "@/lib/gifts/gift-providers";
import { rateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  publicToken: z.string().min(8).max(128),
  /** Integer minor units — the client never sends a decimal string. */
  amountMinor: z.number().int().positive(),
  method: z.enum(GIFT_PAYMENT_METHOD_IDS as [string, ...string[]]),
  guestName: z.string().trim().max(120).optional(),
  guestEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  guestPhone: z.string().trim().max(30).optional(),
  guestMessage: z.string().trim().max(500).optional(),
  isAnonymous: z.boolean().optional(),
  guestToken: z.string().trim().max(128).optional(),
});

/**
 * Start a gift payment.
 *
 * Writes the pending gift record before it ever talks to Paystack, so an
 * abandoned checkout or a provider timeout still leaves a row an organiser can
 * reconcile. The response deliberately contains no wallet or event totals.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  const limited = await rateLimit(`gift-init:${ip}`, 8, 60);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const session = await getServerSession(authOptions);

    const result = await giftPaymentService.initialize({
      publicToken: data.publicToken,
      amountMinor: data.amountMinor,
      method: data.method,
      guestName: data.guestName ?? null,
      guestEmail: data.guestEmail || null,
      guestPhone: data.guestPhone ?? null,
      guestMessage: data.guestMessage ?? null,
      isAnonymous: data.isAnonymous ?? false,
      guestToken: data.guestToken ?? null,
      userId: session?.user?.id ?? null,
      ip,
      userAgent: req.headers.get("user-agent"),
    });

    await createAuditLog({
      userId: session?.user?.id,
      action: "PAYMENT",
      entity: "event_gift_payment",
      entityId: result.reference,
      details: { action: "INITIALIZED", amountMinor: result.amountMinor, method: result.method },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof GiftPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gifts.initialize]", error);
    return NextResponse.json(
      { error: "We could not start this gift. Please try again." },
      { status: 500 }
    );
  }
}
