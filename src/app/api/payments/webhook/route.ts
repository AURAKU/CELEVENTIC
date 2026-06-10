import { NextResponse } from "next/server";
import { paymentService } from "@/services/payments/payment.service";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
    const signature = req.headers.get("x-paystack-signature") ?? "";

    const adapter = paymentService.getAdapter("PAYSTACK");
    const valid = await adapter.verifyWebhook(rawBody, signature);

    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const reference = body.data?.reference;
    const status = body.event === "charge.success" ? "SUCCESSFUL" : "FAILED";

    if (reference) {
      const payment = await paymentService.updatePaymentStatus(reference, status);
      const { prisma } = await import("@/lib/prisma");
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          action: "WEBHOOK",
          payload: { event: body.event, status },
        },
      });
      await createAuditLog({
        action: "WEBHOOK",
        entity: "payment",
        entityId: reference,
        details: { event: body.event, status },
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
