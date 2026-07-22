import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { paymentService, PaymentProviderError } from "@/services/payments/payment.service";

const initSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional(),
  email: z.string().email(),
  purpose: z.enum([
    "EVENT_PACKAGE",
    "TICKET_PURCHASE",
    "BULK_MESSAGING",
    "ADVERTISING",
    "VENDOR_BOOKING",
    "CONTRIBUTION",
  ]),
  /** Optional override — when omitted, platform default provider is used */
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE", "HUBTEL"]).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  ticketOrderId: z.string().optional(),
  campaignId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  try {
    const body = await req.json();
    const data = initSchema.parse(body);

    const result = await paymentService.initializePayment(
      session?.user?.id,
      data.provider ?? null,
      data.purpose,
      {
        amount: data.amount,
        currency: data.currency,
        email: data.email,
        purpose: data.purpose,
        metadata: data.metadata,
      },
      { ticketOrderId: data.ticketOrderId, campaignId: data.campaignId }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[payments.initialize]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment initialization failed" },
      { status: 500 }
    );
  }
}
