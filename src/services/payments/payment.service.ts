import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { getAppUrlFromEnv } from "@/lib/app-url";
import {
  getProviderCredentials,
  getProviderSecret,
  isProviderEnabled,
} from "@/lib/integrations/integration-runtime";
import { resolvePaymentProvider } from "@/lib/integrations/platform-provider-settings";
import type { PaymentInitRequest, PaymentInitResponse } from "@/types";
import type { PaymentProvider, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

export interface PaymentProviderAdapter {
  initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
  verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }>;
  /** Extract reference + success from provider webhook body */
  parseWebhook?(
    payload: unknown,
    headers: Headers
  ): Promise<{ reference: string | null; successful: boolean } | null>;
}

function requireSecret(provider: string, secret: string | null): string {
  if (!secret) {
    throw new PaymentProviderError(
      `${provider} is not configured or disabled. Add credentials in Admin → Integrations.`
    );
  }
  return secret;
}

class PaystackAdapter implements PaymentProviderAdapter {
  private async secretKey(): Promise<string | null> {
    if (!(await isProviderEnabled("PAYSTACK"))) return null;
    return getProviderSecret("PAYSTACK");
  }

  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    const secretKey = requireSecret("Paystack", await this.secretKey());
    const creds = await getProviderCredentials("PAYSTACK");
    const callbackUrl =
      (typeof creds.config.callbackUrl === "string" && creds.config.callbackUrl) ||
      `${getAppUrlFromEnv()}/dashboard/wallet?payment=callback`;

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
        callback_url: callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };

    if (!res.ok || !data.data?.authorization_url) {
      throw new PaymentProviderError(data.message || "Paystack failed to initialize payment");
    }

    return {
      reference: params.reference,
      authorizationUrl: data.data.authorization_url,
      provider: "PAYSTACK",
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const secret = await this.secretKey();
    if (!secret || !signature) return false;
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    const hash = crypto.createHmac("sha512", secret).update(raw).digest("hex");
    return hash === signature;
  }

  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    const secretKey = requireSecret("Paystack", await this.secretKey());
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = (await res.json()) as {
      data?: { status?: string; amount?: number };
    };
    const status = data.data?.status === "success" ? "SUCCESSFUL" : "FAILED";
    return { status: status as PaymentStatus, amount: (data.data?.amount ?? 0) / 100 };
  }

  async parseWebhook(payload: unknown): Promise<{ reference: string | null; successful: boolean } | null> {
    const body = payload as { event?: string; data?: { reference?: string } };
    if (!body?.data) return null;
    return {
      reference: body.data.reference ?? null,
      successful: body.event === "charge.success",
    };
  }
}

class FlutterwaveAdapter implements PaymentProviderAdapter {
  private async secretKey(): Promise<string | null> {
    if (!(await isProviderEnabled("FLUTTERWAVE"))) return null;
    return getProviderSecret("FLUTTERWAVE");
  }

  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    const secretKey = requireSecret("Flutterwave", await this.secretKey());
    const creds = await getProviderCredentials("FLUTTERWAVE");
    const redirectUrl =
      (typeof creds.config.redirectUrl === "string" && creds.config.redirectUrl) ||
      `${getAppUrlFromEnv()}/dashboard/wallet?payment=callback`;

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount,
        currency: params.currency ?? "GHS",
        redirect_url: redirectUrl,
        customer: {
          email: params.email,
          name: typeof params.metadata?.customerName === "string" ? params.metadata.customerName : undefined,
        },
        customizations: {
          title: "Celeventic",
          description: typeof params.metadata?.description === "string" ? params.metadata.description : "Payment",
        },
        meta: params.metadata,
      }),
    });

    const data = (await res.json()) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };

    if (!res.ok || data.status !== "success" || !data.data?.link) {
      throw new PaymentProviderError(data.message || "Flutterwave failed to initialize payment");
    }

    return {
      reference: params.reference,
      authorizationUrl: data.data.link,
      provider: "FLUTTERWAVE",
    };
  }

  async verifyWebhook(_payload: unknown, signature: string): Promise<boolean> {
    const creds = await getProviderCredentials("FLUTTERWAVE");
    if (!creds.enabled) return false;
    const webhookHash =
      (typeof creds.config.webhookHash === "string" && creds.config.webhookHash) ||
      creds.secret;
    if (!webhookHash || !signature) return false;
    return signature === webhookHash;
  }

  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    const secretKey = requireSecret("Flutterwave", await this.secretKey());
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const data = (await res.json()) as {
      status?: string;
      data?: { status?: string; amount?: number };
    };
    const ok = data.status === "success" && data.data?.status === "successful";
    return {
      status: ok ? "SUCCESSFUL" : "FAILED",
      amount: Number(data.data?.amount ?? 0),
    };
  }

  async parseWebhook(payload: unknown): Promise<{ reference: string | null; successful: boolean } | null> {
    const body = payload as {
      event?: string;
      data?: { tx_ref?: string; status?: string };
    };
    if (!body?.data) return null;
    return {
      reference: body.data.tx_ref ?? null,
      successful: body.data.status === "successful" || body.event === "charge.completed",
    };
  }
}

class HubtelAdapter implements PaymentProviderAdapter {
  private async credentials() {
    if (!(await isProviderEnabled("HUBTEL"))) {
      return { clientId: null as string | null, clientSecret: null as string | null, config: {} as Record<string, unknown> };
    }
    const creds = await getProviderCredentials("HUBTEL");
    return {
      clientId: creds.publicKey,
      clientSecret: creds.secret,
      config: creds.config,
    };
  }

  private basicAuth(clientId: string, clientSecret: string): string {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }

  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    const { clientId, clientSecret, config } = await this.credentials();
    if (!clientId || !clientSecret) {
      throw new PaymentProviderError(
        "Hubtel is not configured. Set Client ID (public key) and Client Secret in Admin → Integrations."
      );
    }

    const merchantAccountNumber =
      (typeof config.merchantAccountNumber === "string" && config.merchantAccountNumber) ||
      (typeof config.accountNumber === "string" && config.accountNumber) ||
      null;

    if (!merchantAccountNumber) {
      throw new PaymentProviderError(
        "Hubtel requires merchantAccountNumber in integration config (Admin → Integrations → Hubtel → Config JSON)."
      );
    }

    const callbackUrl =
      (typeof config.callbackUrl === "string" && config.callbackUrl) ||
      `${getAppUrlFromEnv()}/api/payments/webhook?provider=HUBTEL`;
    const returnUrl =
      (typeof config.returnUrl === "string" && config.returnUrl) ||
      `${getAppUrlFromEnv()}/dashboard/wallet?payment=callback`;
    const cancellationUrl =
      (typeof config.cancellationUrl === "string" && config.cancellationUrl) || returnUrl;

    const res = await fetch("https://api.hubtel.com/v2/pos/onlinecheckout/items/initiate", {
      method: "POST",
      headers: {
        Authorization: this.basicAuth(clientId, clientSecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        totalAmount: params.amount,
        description:
          typeof params.metadata?.description === "string"
            ? params.metadata.description
            : "Celeventic payment",
        callbackUrl,
        returnUrl,
        merchantAccountNumber,
        cancellationUrl,
        clientReference: params.reference,
      }),
    });

    const data = (await res.json()) as {
      ResponseCode?: string;
      Message?: string;
      Data?: { checkoutUrl?: string; checkoutDirectUrl?: string; checkoutId?: string };
      data?: { checkoutUrl?: string; checkoutDirectUrl?: string };
    };

    const checkoutUrl =
      data.Data?.checkoutUrl ||
      data.Data?.checkoutDirectUrl ||
      data.data?.checkoutUrl ||
      data.data?.checkoutDirectUrl;

    if (!res.ok || !checkoutUrl) {
      throw new PaymentProviderError(data.Message || "Hubtel failed to initialize checkout");
    }

    return {
      reference: params.reference,
      authorizationUrl: checkoutUrl,
      provider: "HUBTEL",
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    // Hubtel callbacks are server-to-server; optional shared secret in config.webhookSecret
    const creds = await getProviderCredentials("HUBTEL");
    if (!creds.enabled) return false;
    const webhookSecret =
      typeof creds.config.webhookSecret === "string" ? creds.config.webhookSecret : null;
    if (!webhookSecret) {
      // No shared secret configured — accept only when provider enabled (Hubtel POS callbacks often unsigned)
      return true;
    }
    if (!signature) return false;
    return signature === webhookSecret;
  }

  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    const { clientId, clientSecret, config } = await this.credentials();
    if (!clientId || !clientSecret) {
      throw new PaymentProviderError("Hubtel is not configured");
    }
    const merchantAccountNumber =
      (typeof config.merchantAccountNumber === "string" && config.merchantAccountNumber) || "";
    const url = new URL("https://api.hubtel.com/v1/merchantaccount/onlinecheckout/invoice/status");
    if (merchantAccountNumber) url.searchParams.set("merchantAccountNumber", merchantAccountNumber);
    url.searchParams.set("clientReference", reference);

    const res = await fetch(url.toString(), {
      headers: { Authorization: this.basicAuth(clientId, clientSecret) },
    });
    const data = (await res.json()) as {
      status?: string;
      Status?: string;
      amount?: number;
      Amount?: number;
      Data?: { status?: string; amount?: number };
    };
    const statusRaw = (
      data.Data?.status ||
      data.status ||
      data.Status ||
      ""
    ).toLowerCase();
    const ok = statusRaw === "paid" || statusRaw === "success" || statusRaw === "successful";
    return {
      status: ok ? "SUCCESSFUL" : "FAILED",
      amount: Number(data.Data?.amount ?? data.amount ?? data.Amount ?? 0),
    };
  }

  async parseWebhook(payload: unknown): Promise<{ reference: string | null; successful: boolean } | null> {
    const body = payload as Record<string, unknown>;
    const data = (body.Data as Record<string, unknown> | undefined) ?? body;
    const reference =
      (typeof data.ClientReference === "string" && data.ClientReference) ||
      (typeof data.clientReference === "string" && data.clientReference) ||
      (typeof body.ClientReference === "string" && body.ClientReference) ||
      null;
    const status = String(data.Status ?? data.status ?? body.Status ?? "").toLowerCase();
    const successful = ["paid", "success", "successful", "completed"].includes(status);
    if (!reference) return null;
    return { reference, successful };
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
    provider: PaymentProvider | null | undefined,
    purpose: PaymentPurpose,
    request: PaymentInitRequest,
    relations?: {
      ticketOrderId?: string;
      campaignId?: string;
      invitationOrderId?: string;
      vendorBookingId?: string;
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
    const resolvedProvider = await resolvePaymentProvider(provider);

    if (relations?.idempotencyKey) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey: relations.idempotencyKey },
      });
      if (existing) {
        if (existing.status === "SUCCESSFUL") {
          return { payment: existing, reference: existing.reference, provider: existing.provider };
        }
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
        provider: resolvedProvider,
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
        vendorBookingId: relations?.vendorBookingId,
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

    try {
      const adapter = this.adapters[resolvedProvider];
      const result = await adapter.initializePayment({ ...request, reference });

      if (!result.authorizationUrl) {
        throw new PaymentProviderError(`${resolvedProvider} did not return a checkout URL`);
      }

      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          action: "INITIALIZED",
          payload: { provider: resolvedProvider, purpose },
        },
      });

      return { payment, ...result };
    } catch (error) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          action: "INIT_FAILED",
          payload: {
            provider: resolvedProvider,
            error: error instanceof Error ? error.message : "unknown",
          },
        },
      });
      throw error;
    }
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
    } else if (payment.purpose === "VENDOR_BOOKING") {
      const meta = payment.metadata as Record<string, unknown> | null;
      const bookingId = typeof meta?.bookingId === "string" ? meta.bookingId : null;
      if (bookingId) {
        const { marketplaceEscrowService } = await import("@/services/marketplace/marketplace-escrow.service");
        await marketplaceEscrowService.onPaymentSuccess(payment.id, bookingId);
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

  detectWebhookProvider(headers: Headers, queryProvider?: string | null): PaymentProvider | null {
    if (queryProvider === "PAYSTACK" || queryProvider === "FLUTTERWAVE" || queryProvider === "HUBTEL") {
      return queryProvider;
    }
    if (headers.get("x-paystack-signature")) return "PAYSTACK";
    if (headers.get("verif-hash")) return "FLUTTERWAVE";
    if (headers.get("x-hubtel-signature") || headers.get("x-hubtel-secret")) return "HUBTEL";
    return null;
  }
}

export const paymentService = new PaymentService();
