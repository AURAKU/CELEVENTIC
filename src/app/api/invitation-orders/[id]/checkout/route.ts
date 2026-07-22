import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";
import { paymentService } from "@/services/payments/payment.service";
import { pricingService } from "@/services/commerce/pricing.service";
import { prisma } from "@/lib/prisma";
import type { DisplayCurrency } from "@/lib/commerce/constants";
import { complianceService } from "@/services/legal/compliance.service";
import { productionWorkflowService } from "@/services/invitations/production-workflow.service";
import { invitationAnalyticsService } from "@/services/invitation-os/invitation-analytics.service";
import { addonFulfillmentService } from "@/services/invitation-os/addon-fulfillment.service";
import { isAdminCommerceBypass } from "@/lib/access/package-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminBypass = isAdminCommerceBypass(session.user.role);

  try {
    const order = await invitationOrderService.getOrderForUser(id, session.user.id);

    if (!order.eventTitle || !order.eventDate) {
      return NextResponse.json({ error: "Complete event details before checkout" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { displayCurrency: dc, acceptTerms, portfolioConsent } = body as {
      displayCurrency?: string;
      acceptTerms?: boolean;
      portfolioConsent?: boolean;
    };

    if (!acceptTerms && !adminBypass) {
      return NextResponse.json({ error: "You must accept the Terms and Privacy Policy" }, { status: 400 });
    }

    const versions = await complianceService.getCurrentVersions();
    const displayCurrency = (dc ?? order.displayCurrency ?? "GHS") as DisplayCurrency;
    const addonSlugs = (order.addonSlugs as string[] | null) ?? [];
    const pricing = await pricingService.calculateOrderPricing(order.packageSlug, addonSlugs, displayCurrency);
    const amount = adminBypass ? 0 : pricing.totalGhs;

    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: {
        totalAmountGhs: amount,
        displayCurrency: pricing.displayCurrency,
        displayAmount: adminBypass ? 0 : pricing.displayAmount,
        exchangeRate: pricing.exchangeRate,
        idempotencyKey: order.idempotencyKey ?? `order-${order.id}`,
        portfolioConsent: portfolioConsent ?? false,
        termsAcceptedVersion: versions.terms?.version ?? order.termsAcceptedVersion,
        privacyAcceptedVersion: versions.privacy?.version ?? order.privacyAcceptedVersion,
      },
    });

    if (acceptTerms || adminBypass) {
      await complianceService.recordConsent(session.user.id, "TERMS", { version: versions.terms?.version });
      await complianceService.recordConsent(session.user.id, "PRIVACY", { version: versions.privacy?.version });
      await complianceService.recordConsent(session.user.id, "PORTFOLIO", {
        value: portfolioConsent ? "allowed" : "private",
        metadata: { invitationOrderId: order.id, adminBypass },
      });
    }

    await invitationAnalyticsService.track({
      eventType: "CHECKOUT_START",
      orderId: order.id,
      userId: session.user.id,
      packageSlug: order.packageSlug,
      templateSlug: order.templateSlug,
    });

    if (amount <= 0 || adminBypass) {
      await prisma.invitationOrder.update({
        where: { id: order.id },
        data: { status: "PAID", workflowStage: "PAYMENT_SUCCESSFUL", totalAmountGhs: 0 },
      });
      await addonFulfillmentService.fulfillOrderAddons(order.id);
      await invitationAnalyticsService.track({
        eventType: "PAYMENT_SUCCESS",
        orderId: order.id,
        revenueGhs: 0,
        packageSlug: order.packageSlug,
        templateSlug: order.templateSlug,
      });
      return NextResponse.json({
        success: true,
        data: {
          free: true,
          unlockStudio: true,
          adminBypass,
          next: "studio",
        },
      });
    }

    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: { status: "PENDING_PAYMENT" },
    });
    await productionWorkflowService.onPaymentPending(order.id);

    const email = order.contactEmail ?? session.user.email ?? "guest@celeventic.com";
    const payment = await paymentService.initializePayment(
      session.user.id,
      null,
      "INVITATION_ORDER",
      {
        email,
        amount,
        currency: "GHS",
        purpose: "INVITATION_ORDER",
        metadata: { invitationOrderId: order.id, templateSlug: order.templateSlug },
      },
      {
        invitationOrderId: order.id,
        idempotencyKey: `order-${order.id}`,
        commerce: {
          baseCurrency: "GHS",
          baseAmount: amount,
          displayCurrency: pricing.displayCurrency,
          displayAmount: pricing.displayAmount,
          exchangeRate: pricing.exchangeRate,
          rateSource: pricing.rateSource,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        reference: payment.reference,
        authorizationUrl: payment.authorizationUrl,
        baseAmount: amount,
        baseCurrency: "GHS",
        displayAmount: pricing.displayAmount,
        displayCurrency: pricing.displayCurrency,
        exchangeRate: pricing.exchangeRate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
