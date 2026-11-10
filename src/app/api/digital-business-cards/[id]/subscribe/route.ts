import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAppUrlFromEnv } from "@/lib/app-url";
import { isAdminCommerceBypass } from "@/lib/access/package-access";
import {
  SMARTCARD_CURRENCY,
  SMARTCARD_PAYMENT_KIND,
  getSmartCardPlanFromCatalog,
} from "@/lib/digital-business-card/plans";
import { getCeleCardCatalog } from "@/services/digital-business-card/catalog.service";
import { resolveCeleCardLifecycle } from "@/lib/digital-business-card/lifecycle";
import {
  activateDigitalCardPlan,
  getDigitalCardForUser,
  isDigitalCardLive,
  recordCeleCardLifecycleEvent,
} from "@/services/digital-business-card/digital-business-card.service";
import { paymentService, PaymentProviderError } from "@/services/payments/payment.service";

const bodySchema = z.object({
  planId: z.enum(["monthly", "quarter", "half", "yearly"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a plan" }, { status: 400 });
  }

  const catalog = await getCeleCardCatalog();
  const plan = getSmartCardPlanFromCatalog(parsed.data.planId, catalog.plans);
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const card = await getDigitalCardForUser(session.user.id, id);
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lifecycle = resolveCeleCardLifecycle(card);
  if (lifecycle === "SUSPENDED" || lifecycle === "DELETED") {
    return NextResponse.json({ error: "This CeleYou cannot be reactivated from billing." }, { status: 403 });
  }

  await recordCeleCardLifecycleEvent({
    cardId: card.id,
    kind: isDigitalCardLive(card) ? "ReactivationStarted" : "CheckoutStarted",
    meta: { planId: plan.id },
  }).catch(() => undefined);

  if (isAdminCommerceBypass(session.user.role)) {
    const activated = await activateDigitalCardPlan(session.user.id, id, plan.id);
    if (!activated) return NextResponse.json({ error: "Could not activate" }, { status: 500 });
    return NextResponse.json({
      success: true,
      data: {
        free: true,
        adminBypass: true,
        card: { ...activated, isLive: isDigitalCardLive(activated) },
      },
    });
  }

  const email = session.user.email;
  if (!email) {
    return NextResponse.json({ error: "Add an email to your account before paying" }, { status: 400 });
  }

  try {
    const result = await paymentService.initializePayment(
      session.user.id,
      null,
      "ADVERTISING",
      {
        amount: plan.priceGhs,
        currency: SMARTCARD_CURRENCY,
        email,
        purpose: "ADVERTISING",
        callbackUrl: `${getAppUrlFromEnv()}/dashboard/business-card/billing?payment=callback`,
        metadata: {
          kind: SMARTCARD_PAYMENT_KIND,
          cardId: card.id,
          planId: plan.id,
          userId: session.user.id,
          months: plan.months,
          priceGhs: plan.priceGhs,
          pricePesewas: plan.pricePesewas,
          currency: SMARTCARD_CURRENCY,
        },
      },
      {
        idempotencyKey: `smartcard-${card.id}-${plan.id}-${Math.floor(Date.now() / 60000)}`,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        planId: plan.id,
      },
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[smartcard.subscribe]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
