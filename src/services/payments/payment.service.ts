import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import type { PaymentInitRequest, PaymentInitResponse } from "@/types";
import type { PaymentProvider, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";

export interface PaymentProviderAdapter {
  initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
  verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }>;
}

class PaystackAdapter implements PaymentProviderAdapter {
  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return { reference: params.reference, provider: "PAYSTACK" };
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100),
        currency: params.currency ?? "GHS",
        reference: params.reference,
        metadata: params.metadata,
      }),
    });

    const data = await res.json();
    return {
      reference: params.reference,
      authorizationUrl: data.data?.authorization_url,
      provider: "PAYSTACK",
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !signature) return false;
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    const hash = crypto.createHmac("sha512", secret).update(raw).digest("hex");
    return hash === signature;
  }

  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return { status: "PENDING", amount: 0 };

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();
    const status = data.data?.status === "success" ? "SUCCESSFUL" : "FAILED";
    return { status: status as PaymentStatus, amount: (data.data?.amount ?? 0) / 100 };
  }
}

class FlutterwaveAdapter implements PaymentProviderAdapter {
  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    return { reference: params.reference, provider: "FLUTTERWAVE" };
  }
  async verifyWebhook(): Promise<boolean> { return true; }
  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    return { status: "PENDING", amount: 0 };
  }
}

class HubtelAdapter implements PaymentProviderAdapter {
  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    return { reference: params.reference, provider: "HUBTEL" };
  }
  async verifyWebhook(): Promise<boolean> { return true; }
  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    return { status: "PENDING", amount: 0 };
  }
}

export class PaymentService {
  private adapters: Record<PaymentProvider, PaymentProviderAdapter> = {
    PAYSTACK: new PaystackAdapter(),
    FLUTTERWAVE: new FlutterwaveAdapter(),
    HUBTEL: new HubtelAdapter(),
  };

  async initializePayment(
    userId: string | undefined,
    provider: PaymentProvider,
    purpose: PaymentPurpose,
    request: PaymentInitRequest,
    relations?: {
      ticketOrderId?: string;
      campaignId?: string;
      invitationOrderId?: string;
      idempotencyKey?: string;
      commerce?: {
        baseCurrency: string;
        baseAmount: number;
        displayCurrency: string;
        displayAmount: number;
        exchangeRate: number;
        rateSource: string;
      };
    }
  ) {
    if (relations?.idempotencyKey) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey: relations.idempotencyKey },
      });
      if (existing) {
        const adapter = this.adapters[existing.provider];
        const result = await adapter.initializePayment({
          ...request,
          reference: existing.reference,
          amount: Number(existing.baseAmount ?? existing.amount),
          currency: existing.baseCurrency ?? "GHS",
        });
        return { payment: existing, ...result };
      }
    }

    const reference = `CEV-${generateToken(16)}`;
    const baseAmount = relations?.commerce?.baseAmount ?? request.amount;
    const payCurrency = relations?.commerce?.baseCurrency ?? request.currency ?? "GHS";

    const payment = await prisma.payment.create({
      data: {
        userId,
        reference,
        provider,
        purpose,
        amount: baseAmount,
        currency: payCurrency,
        baseCurrency: relations?.commerce?.baseCurrency ?? "GHS",
        baseAmount: relations?.commerce?.baseAmount ?? baseAmount,
        displayCurrency: relations?.commerce?.displayCurrency,
        displayAmount: relations?.commerce?.displayAmount,
        exchangeRate: relations?.commerce?.exchangeRate,
        idempotencyKey: relations?.idempotencyKey,
        metadata: request.metadata as Prisma.InputJsonValue | undefined,
        ticketOrderId: relations?.ticketOrderId,
        campaignId: relations?.campaignId,
        invitationOrderId: relations?.invitationOrderId,
      },
    });

    if (relations?.commerce) {
      await prisma.paymentCurrencyLog.create({
        data: {
          paymentId: payment.id,
          invitationOrderId: relations.invitationOrderId,
          baseCurrency: relations.commerce.baseCurrency,
          baseAmount: relations.commerce.baseAmount,
          displayCurrency: relations.commerce.displayCurrency,
          displayAmount: relations.commerce.displayAmount,
          exchangeRate: relations.commerce.exchangeRate,
          rateSource: relations.commerce.rateSource,
        },
      });
    }

    const adapter = this.adapters[provider];
    const result = await adapter.initializePayment({ ...request, reference });

    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        action: "INITIALIZED",
        payload: { provider, purpose },
      },
    });

    return { payment, ...result };
  }

  async updatePaymentStatus(reference: string, status: PaymentStatus) {
    const existing = await prisma.payment.findUnique({ where: { reference } });
    if (!existing) throw new Error("Payment not found");
    if (existing.status === "SUCCESSFUL" && status === "SUCCESSFUL") {
      return existing;
    }

    const payment = await prisma.payment.update({
      where: { reference },
      data: { status },
      include: { ticketOrder: true, campaign: true, invitationOrder: true },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        action: "STATUS_UPDATE",
        payload: { status },
      },
    });

    if (status === "SUCCESSFUL") {
      await this.onPaymentSuccess({
        id: payment.id,
        purpose: payment.purpose,
        amount: payment.amount,
        currency: payment.currency,
        metadata: payment.metadata,
        ticketOrderId: payment.ticketOrderId,
        campaignId: payment.campaignId,
      });
    }

    return payment;
  }

  private async onPaymentSuccess(payment: {
    id: string;
    purpose: PaymentPurpose;
    amount: unknown;
    currency: string;
    metadata: unknown;
    ticketOrderId: string | null;
    campaignId: string | null;
  }) {
    if (payment.ticketOrderId) {
      const { ticketService } = await import("@/services/tickets/ticket.service");
      await ticketService.confirmPurchase(payment.ticketOrderId);
    }

    if (payment.purpose === "CONTRIBUTION") {
      const meta = payment.metadata as Record<string, unknown> | null;
      if (meta?.eventId && meta?.contributor) {
        const { contributionService } = await import("@/services/contributions/contribution.service");
        await contributionService.createFromPayment(
          payment.id,
          {
            eventId: String(meta.eventId),
            contributor: String(meta.contributor),
            message: typeof meta.message === "string" ? meta.message : undefined,
            isAnonymous: Boolean(meta.isAnonymous),
          },
          Number(payment.amount),
          payment.currency
        );
      }
    } else if (payment.purpose === "INVITATION_REVISION") {
      const meta = payment.metadata as Record<string, unknown> | null;
      const revisionId = typeof meta?.revisionId === "string" ? meta.revisionId : null;
      if (revisionId) {
        const { productionWorkflowService } = await import("@/services/invitations/production-workflow.service");
        await productionWorkflowService.onRevisionPaymentSuccess(revisionId);
      }
    } else if (payment.purpose === "INVITATION_ORDER") {
      const meta = payment.metadata as Record<string, unknown> | null;
      const orderId = typeof meta?.invitationOrderId === "string" ? meta.invitationOrderId : null;
      if (orderId) {
        const { invitationOrderService } = await import("@/services/invitations/invitation-order.service");
        const { emailTemplateService } = await import("@/services/i18n/email-template.service");
        const { languageService } = await import("@/services/i18n/language.service");
        const order = await prisma.invitationOrder.findUnique({
          where: { id: orderId },
          include: { user: true },
        });
        await prisma.invitationOrder.update({
          where: { id: orderId },
          data: { status: "PAID", workflowStage: "PAYMENT_SUCCESSFUL" },
        });
        const { addonFulfillmentService } = await import("@/services/invitation-os/addon-fulfillment.service");
        const { invitationAnalyticsService } = await import("@/services/invitation-os/invitation-analytics.service");
        await addonFulfillmentService.fulfillOrderAddons(orderId);
        await invitationAnalyticsService.track({
          eventType: "PAYMENT_SUCCESS",
          orderId,
          revenueGhs: Number(payment.amount),
          packageSlug: order?.packageSlug,
          templateSlug: order?.templateSlug,
        });
        await invitationOrderService.publishFromPayment(orderId);
        if (order?.user?.email) {
          const locale = await languageService.getUserPreference(order.userId);
          await emailTemplateService.sendLocalized("payment_confirmation", order.user.email, locale, {
            name: order.user.name,
            amount: `${payment.currency} ${payment.amount}`,
          });
        }
      }
    } else {
      const { walletService } = await import("@/services/wallet/wallet.service");
      await walletService.settlePayment(payment.id);
    }

    if (payment.campaignId) {
      const { dispatchJob } = await import("@/lib/queue");
      await dispatchJob("campaign-send", { campaignId: payment.campaignId });
    }
  }

  getAdapter(provider: PaymentProvider) {
    return this.adapters[provider];
  }
}

export const paymentService = new PaymentService();
