import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { paymentService, PaymentProviderError } from "@/services/payments/payment.service";
import { prisma } from "@/lib/prisma";
import { CELECARD_CONCIERGE_PAYMENT_KIND, SMARTCARD_CURRENCY } from "@/lib/digital-business-card/plans";
import { isCheckoutMethodId } from "@/lib/payments/checkout-methods";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Sign in with the invited email to pay for concierge." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const order = await prisma.smartCardConciergeOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const email = session.user.email.trim().toLowerCase();
  if (order.customerEmail !== email && order.customerUserId !== session.user.id) {
    return NextResponse.json({ error: "This concierge order belongs to a different account." }, { status: 403 });
  }
  if (order.status === "PAID" || order.status === "READY" || order.status === "DELIVERED") {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }

  await prisma.smartCardConciergeOrder.update({
    where: { id: order.id },
    data: { customerUserId: order.customerUserId || session.user.id, status: "AWAITING_PAYMENT" },
  });

  const body = (await req.json().catch(() => ({}))) as { method?: unknown };
  const method = isCheckoutMethodId(body.method) ? body.method : undefined;

  try {
    const result = await paymentService.initializePayment(
      session.user.id,
      null,
      "ADVERTISING",
      {
        amount: order.totalGhs,
        currency: SMARTCARD_CURRENCY,
        email: session.user.email,
        purpose: "ADVERTISING",
        method,
        callbackUrl: `${getAppUrlFromEnv()}/dashboard/business-card/concierge?payment=callback`,
        metadata: {
          kind: CELECARD_CONCIERGE_PAYMENT_KIND,
          orderId: order.id,
          userId: session.user.id,
          planId: order.planId,
          designFeeGhs: order.designFeeGhs,
          subscriptionFeeGhs: order.subscriptionFeeGhs,
          priceGhs: order.totalGhs,
          currency: SMARTCARD_CURRENCY,
        },
      },
      { idempotencyKey: `concierge-${order.id}-${Math.floor(Date.now() / 60000)}` }
    );
    await prisma.smartCardConciergeOrder.update({
      where: { id: order.id },
      data: { paymentReference: result.reference },
    });
    return NextResponse.json({
      success: true,
      data: { authorizationUrl: result.authorizationUrl, reference: result.reference, totalGhs: order.totalGhs },
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[celecard.concierge.checkout]", error);
    return NextResponse.json({ error: "Could not start concierge checkout" }, { status: 500 });
  }
}
