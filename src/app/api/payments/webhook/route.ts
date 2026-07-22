import { NextResponse } from "next/server";
import { paymentService } from "@/services/payments/payment.service";
import { createAuditLog } from "@/lib/audit";
import type { PaymentProvider } from "@prisma/client";

function webhookSignature(headers: Headers, provider: PaymentProvider): string {
  switch (provider) {
    case "PAYSTACK":
      return headers.get("x-paystack-signature") ?? "";
    case "FLUTTERWAVE":
      return headers.get("verif-hash") ?? "";
    case "HUBTEL":
      return headers.get("x-hubtel-signature") ?? headers.get("x-hubtel-secret") ?? "";
    default:
      return "";
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const queryProvider = url.searchParams.get("provider");
    const rawBody = await req.text();
    let body: unknown = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const provider = paymentService.detectWebhookProvider(req.headers, queryProvider);
    if (!provider) {
      return NextResponse.json(
        { error: "Unable to detect payment provider. Pass ?provider=PAYSTACK|FLUTTERWAVE|HUBTEL or use provider signature headers." },
        { status: 400 }
      );
    }

    const adapter = paymentService.getAdapter(provider);
    const signature = webhookSignature(req.headers, provider);
    const valid = await adapter.verifyWebhook(rawBody, signature);

    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const parsed = adapter.parseWebhook
      ? await adapter.parseWebhook(body, req.headers)
      : null;

    let reference = parsed?.reference ?? null;
    let successful = parsed?.successful ?? false;

    if (!reference && provider === "PAYSTACK") {
      const paystackBody = body as { event?: string; data?: { reference?: string } };
      reference = paystackBody.data?.reference ?? null;
      successful = paystackBody.event === "charge.success";
    }

    if (reference) {
      const status = successful ? "SUCCESSFUL" : "FAILED";
      const payment = await paymentService.updatePaymentStatus(reference, status);
      const { prisma } = await import("@/lib/prisma");
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          action: "WEBHOOK",
          payload: { provider, status, successful },
        },
      });
      await createAuditLog({
        action: "WEBHOOK",
        entity: "payment",
        entityId: reference,
        details: { provider, status },
      });
    }

    return NextResponse.json({ received: true, provider });
  } catch (error) {
    console.error("[payments.webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
