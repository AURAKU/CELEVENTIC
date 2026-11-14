import { NextResponse } from "next/server";
import { CHECKOUT_METHODS } from "@/lib/payments/checkout-methods";
import { isProviderEnabled } from "@/lib/integrations/integration-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const paystack = await isProviderEnabled("PAYSTACK");
  const stripe = await isProviderEnabled("STRIPE");

  const methods = CHECKOUT_METHODS.map((method) => {
    const connected = method.rail === "PAYSTACK" ? paystack : stripe;
    return {
      id: method.id,
      label: method.label,
      description: method.description,
      rail: method.rail,
      connected,
      requiresConnection: method.rail !== "PAYSTACK",
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      methods,
      rails: {
        PAYSTACK: { connected: paystack, methods: ["card", "mobile_money", "bank_transfer"] },
        STRIPE: { connected: stripe, methods: ["alipay", "wechat_pay"] },
      },
    },
  });
}
