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
import { sharedSecretWebhookAllowed } from "@/lib/payments/webhook-guard";
import { parsePaystackWebhook, paystackHmacValid } from "@/lib/payments/paystack";
import {
  getCheckoutMethod,
  ghsToWalletChargeMinor,
  isCheckoutMethodId,
  resolveInitializeChannels,
  type CheckoutMethodId,
} from "@/lib/payments/checkout-methods";
import { parseStripeCheckoutEvent, stripeSignatureValid } from "@/lib/payments/stripe-wallet";
import { nextPaymentStatus } from "@/lib/payments/payment-status";
import { paymentMatchesTicketOrder } from "@/services/tickets/ticket-ledger.service";
import { SMARTCARD_PAYMENT_KIND } from "@/lib/digital-business-card/plans";
import { celeYouPaymentEvidenceMatches } from "@/lib/digital-business-card/billing-rules";
import type { PaymentInitRequest, PaymentInitResponse } from "@/types";
import type { PaymentProvider, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

/**
 * Full provider-side truth about a transaction. Used where a status flag is not
 * enough. A gift may only be credited once the amount, currency and reference
 * the provider reports match what we asked for.
 */
export interface ProviderVerification {
  status: "success" | "failed" | "pending";
  reference: string;
  /** Integer minor units as reported by the provider. */
  amountMinor: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  feesMinor: number;
  gatewayResponse: string | null;
  metadata: Record<string, unknown> | null;
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
  /** Amount/currency-accurate verification for money that credits a wallet */
  verifyTransactionDetailed?(reference: string): Promise<ProviderVerification>;
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
        callback_url: params.callbackUrl || callbackUrl,
        metadata: params.metadata,
        channels: params.channels?.length ? params.channels : ["card", "mobile_money", "bank_transfer"],
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };

    if (res.status === 401) {
      throw new PaymentProviderError("Paystack rejected the secret key");
    }

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
    return paystackHmacValid(raw, signature, secret);
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
    const parsed = parsePaystackWebhook(payload);
    if (parsed.kind !== "charge") return null;
    return {
      reference: parsed.reference,
      successful: parsed.successful,
    };
  }

  /**
   * Authoritative verification straight from Paystack. Minor units are returned
   * untouched so callers can compare them byte-for-byte against what they
   * charged, never round-trip money through a float here.
   */
  async verifyTransactionDetailed(reference: string): Promise<ProviderVerification> {
    const secretKey = requireSecret("Paystack", await this.secretKey());
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const body = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        channel?: string;
        paid_at?: string;
        fees?: number;
        gateway_response?: string;
        metadata?: Record<string, unknown> | string;
      };
    };

    if (!res.ok || !body.data) {
      throw new PaymentProviderError(body.message || "Paystack verification failed");
    }

    const raw = body.data.status;
    const status: ProviderVerification["status"] =
      raw === "success" ? "success" : raw === "abandoned" || raw === "failed" ? "failed" : "pending";

    let metadata: Record<string, unknown> | null = null;
    if (body.data.metadata && typeof body.data.metadata === "object") {
      metadata = body.data.metadata as Record<string, unknown>;
    } else if (typeof body.data.metadata === "string") {
      try {
        metadata = JSON.parse(body.data.metadata) as Record<string, unknown>;
      } catch {
        metadata = null;
      }
    }

    return {
      status,
      reference: body.data.reference ?? reference,
      amountMinor: Math.trunc(Number(body.data.amount ?? 0)),
      currency: (body.data.currency ?? "GHS").toUpperCase(),
      channel: body.data.channel ?? null,
      paidAt: body.data.paid_at ?? null,
      feesMinor: Math.trunc(Number(body.data.fees ?? 0)),
      gatewayResponse: body.data.gateway_response ?? null,
      metadata,
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
    return sharedSecretWebhookAllowed(creds.enabled, webhookSecret, signature);
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

class StripeAdapter implements PaymentProviderAdapter {
  private async secretKey(): Promise<string | null> {
    if (!(await isProviderEnabled("STRIPE"))) return null;
    return getProviderSecret("STRIPE");
  }

  private async webhookSecret(): Promise<string | null> {
    const creds = await getProviderCredentials("STRIPE");
    const fromConfig =
      typeof creds.config.webhookSecret === "string" ? creds.config.webhookSecret.trim() : "";
    return fromConfig || process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
  }

  async initializePayment(params: PaymentInitRequest & { reference: string }): Promise<PaymentInitResponse> {
    const secretKey = requireSecret("Stripe", await this.secretKey());
    const creds = await getProviderCredentials("STRIPE");
    const methodId = isCheckoutMethodId(params.method)
      ? params.method
      : isCheckoutMethodId(params.metadata?.checkoutMethod)
        ? (params.metadata.checkoutMethod as CheckoutMethodId)
        : "alipay";
    const method = getCheckoutMethod(methodId);
    const stripeMethod = method.stripePaymentMethod ?? "alipay";
    const callbackUrl =
      params.callbackUrl ||
      (typeof creds.config.callbackUrl === "string" && creds.config.callbackUrl) ||
      `${getAppUrlFromEnv()}/dashboard/wallet?payment=callback`;
    const ghs = Number(params.amount);
    const cnyMinor = ghsToWalletChargeMinor(ghs, "CNY");
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", callbackUrl);
    body.set("client_reference_id", params.reference);
    body.set("customer_email", params.email);
    body.append("payment_method_types[]", stripeMethod);
    if (stripeMethod === "wechat_pay") {
      body.set("payment_method_options[wechat_pay][client]", "web");
    }
    body.append("line_items[0][quantity]", "1");
    body.append("line_items[0][price_data][currency]", "cny");
    body.append("line_items[0][price_data][unit_amount]", String(cnyMinor));
    body.append("line_items[0][price_data][product_data][name]", "Celeventic");
    body.set("metadata[celeventic_reference]", params.reference);
    body.set("metadata[celeventic_base_currency]", "GHS");
    body.set("metadata[celeventic_base_amount]", String(ghs));
    body.set("metadata[celeventic_base_amount_minor]", String(Math.round(ghs * 100)));
    body.set("metadata[celeventic_method]", methodId);
    body.set("payment_intent_data[metadata][celeventic_reference]", params.reference);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      url?: string;
      id?: string;
    };
    if (!res.ok || !data.url) {
      throw new PaymentProviderError(data.error?.message || "Stripe failed to start Alipay or WeChat Pay checkout");
    }
    return {
      reference: params.reference,
      authorizationUrl: data.url,
      provider: "STRIPE",
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const secret = await this.webhookSecret();
    if (!secret || !signature) return false;
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    return stripeSignatureValid(raw, signature, secret);
  }

  async verifyTransaction(reference: string): Promise<{ status: PaymentStatus; amount: number }> {
    const detailed = await this.verifyTransactionDetailed(reference);
    return {
      status: detailed.status === "success" ? "SUCCESSFUL" : detailed.status === "failed" ? "FAILED" : "PENDING",
      amount: detailed.amountMinor / 100,
    };
  }

  async parseWebhook(payload: unknown): Promise<{ reference: string | null; successful: boolean } | null> {
    const parsed = parseStripeCheckoutEvent(payload);
    if (!parsed) return null;
    return { reference: parsed.reference, successful: parsed.successful };
  }

  async verifyTransactionDetailed(reference: string): Promise<ProviderVerification> {
    const secretKey = requireSecret("Stripe", await this.secretKey());
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?client_reference_id=${encodeURIComponent(reference)}&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const body = (await res.json()) as {
      error?: { message?: string };
      data?: Array<{
        payment_status?: string;
        status?: string;
        amount_total?: number;
        currency?: string;
        metadata?: Record<string, string>;
      }>;
    };
    if (!res.ok || !body.data?.[0]) {
      throw new PaymentProviderError(body.error?.message || "Stripe verification failed");
    }
    const session = body.data[0];
    const paid = session.payment_status === "paid";
    const failed = session.status === "expired";
    const meta = session.metadata ?? {};
    const ghsMinor = Math.trunc(Number(meta.celeventic_base_amount_minor ?? 0));
    return {
      status: paid ? "success" : failed ? "failed" : "pending",
      reference,
      amountMinor: ghsMinor || Math.trunc(Number(session.amount_total ?? 0)),
      currency: (meta.celeventic_base_currency || "GHS").toUpperCase(),
      channel: meta.celeventic_method ?? "alipay",
      paidAt: paid ? new Date().toISOString() : null,
      feesMinor: 0,
      gatewayResponse: session.payment_status ?? null,
      metadata: meta,
    };
  }
}

export class PaymentService {
  private adapters: Record<PaymentProvider, PaymentProviderAdapter> = {
    PAYSTACK: new PaystackAdapter(),
    FLUTTERWAVE: new FlutterwaveAdapter(),
    HUBTEL: new HubtelAdapter(),
    STRIPE: new StripeAdapter(),
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
      /** Use a caller-supplied reference so a pending domain record can be written first */
      reference?: string;
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
    const methodId = isCheckoutMethodId(request.method)
      ? request.method
      : isCheckoutMethodId(request.metadata?.checkoutMethod)
        ? (request.metadata?.checkoutMethod as CheckoutMethodId)
        : null;
    const method = methodId ? getCheckoutMethod(methodId) : null;

    let resolvedProvider: PaymentProvider;
    if (method?.rail === "STRIPE") {
      if (!(await isProviderEnabled("STRIPE"))) {
        throw new PaymentProviderError(
          "Connect Stripe in Admin → Integrations to accept Alipay and WeChat Pay."
        );
      }
      resolvedProvider = "STRIPE";
    } else {
      resolvedProvider = await resolvePaymentProvider(provider);
    }

    const hydratedRequest: PaymentInitRequest = {
      ...request,
      method: methodId ?? request.method,
      channels:
        method?.rail === "STRIPE"
          ? request.channels
          : resolveInitializeChannels(methodId, request.channels),
      metadata: {
        ...(request.metadata ?? {}),
        ...(methodId ? { checkoutMethod: methodId } : {}),
      },
    };

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
          ...hydratedRequest,
          reference: existing.reference,
          amount: Number(existing.baseAmount ?? existing.amount),
          currency: existing.baseCurrency ?? "GHS",
        });
        return { payment: existing, ...result };
      }
    }

    const reference = relations?.reference ?? `CEV-${generateToken(16)}`;
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
        metadata: hydratedRequest.metadata as Prisma.InputJsonValue | undefined,
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
      const result = await adapter.initializePayment({ ...hydratedRequest, reference });

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
    const next = nextPaymentStatus(existing.status, status);
    if (next === existing.status) {
      if (existing.status === "SUCCESSFUL") {
        await this.fulfillCeleYouFromPayment(existing.id);
      }
      return existing;
    }

    const claimed = await prisma.payment.updateMany({
      where: { reference, status: existing.status },
      data: { status: next },
    });
    if (claimed.count === 0) {
      return prisma.payment.findUniqueOrThrow({ where: { reference } });
    }

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { reference },
      include: { ticketOrder: true, campaign: true, invitationOrder: true },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        action: "STATUS_UPDATE",
        payload: { status: next, requested: status },
      },
    });

    if (next === "SUCCESSFUL") {
      await this.onPaymentSuccess({
        id: payment.id,
        reference: payment.reference,
        purpose: payment.purpose,
        amount: payment.amount,
        currency: payment.currency,
        metadata: payment.metadata,
        ticketOrderId: payment.ticketOrderId,
        campaignId: payment.campaignId,
      });
    } else if (next === "FAILED") {
      await this.recordCeleYouCheckoutFailed(payment);
      if (payment.purpose === "EVENT_GIFT") {
        const { giftPaymentService } = await import("@/services/gifts/gift-payment.service");
        await giftPaymentService.markFailedFromProvider(payment.reference, next);
      }
    } else if (payment.purpose === "EVENT_GIFT") {
      // Gifts need an explicit terminal state so the guest's pending screen can
      // stop waiting instead of spinning until it times out.
      const { giftPaymentService } = await import("@/services/gifts/gift-payment.service");
      await giftPaymentService.markFailedFromProvider(payment.reference, next);
    }

    return payment;
  }

  async confirmReference(reference: string) {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "SUCCESSFUL") return payment;
    const adapter = this.adapters[payment.provider];
    const result = await adapter.verifyTransaction(reference);
    if (result.status === "SUCCESSFUL") {
      return this.updatePaymentStatus(reference, "SUCCESSFUL");
    }
    return payment;
  }

  /**
   * Owner-return checkout. Success still activates only through updatePaymentStatus.
   * Terminal provider failure is stored as FAILED and never activates.
   * In-flight provider states stay PENDING.
   */
  async confirmCheckoutReference(reference: string) {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "FAILED") return payment;

    if (payment.status !== "SUCCESSFUL") {
      const adapter = this.adapters[payment.provider];
      if (adapter.verifyTransactionDetailed) {
        const detailed = await adapter.verifyTransactionDetailed(reference);
        if (detailed.status === "success") {
          await this.updatePaymentStatus(reference, "SUCCESSFUL");
        } else if (detailed.status === "failed") {
          return this.updatePaymentStatus(reference, "FAILED");
        } else {
          return payment;
        }
      } else {
        const result = await adapter.verifyTransaction(reference);
        if (result.status === "SUCCESSFUL") {
          await this.updatePaymentStatus(reference, "SUCCESSFUL");
        } else {
          return payment;
        }
      }
    }

    const latest = await prisma.payment.findUniqueOrThrow({ where: { reference } });
    if (latest.status === "SUCCESSFUL") {
      await this.fulfillCeleYouFromPayment(latest.id);
    }
    return latest;
  }

  private async fulfillCeleYouFromPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status !== "SUCCESSFUL") return;
    const meta = payment.metadata as Record<string, unknown> | null;
    if (meta?.kind !== SMARTCARD_PAYMENT_KIND) return;

    const cardId = typeof meta.cardId === "string" ? meta.cardId : "";
    const planId = typeof meta.planId === "string" ? meta.planId : "";
    const userId = typeof meta.userId === "string" ? meta.userId : payment.userId || "";
    if (!cardId || !planId || !userId) return;

    const { activateDigitalCardFromPayment, recordCeleCardLifecycleEvent } = await import(
      "@/services/digital-business-card/digital-business-card.service"
    );

    const adapter = this.adapters[payment.provider];
    if (adapter.verifyTransactionDetailed) {
      try {
        const detailed = await adapter.verifyTransactionDetailed(payment.reference);
        const matches = celeYouPaymentEvidenceMatches({
          storedAmountGhs: Number(payment.amount),
          storedCurrency: payment.currency,
          providerAmountMinor: detailed.amountMinor,
          providerCurrency: detailed.currency,
          providerStatus: detailed.status,
        });
        if (!matches) {
          console.error("[smartcard.activate] provider evidence mismatch", payment.id, detailed);
          await recordCeleCardLifecycleEvent({
            cardId,
            kind: "ActivationFailed",
            meta: {
              paymentId: payment.id,
              planId,
              reason: "provider-mismatch",
              providerStatus: detailed.status,
              providerAmountMinor: detailed.amountMinor,
              providerCurrency: detailed.currency,
            },
          });
          return;
        }
      } catch (error) {
        console.error("[smartcard.activate] provider verify failed", payment.id, error);
        await recordCeleCardLifecycleEvent({
          cardId,
          kind: "ActivationFailed",
          meta: {
            paymentId: payment.id,
            planId,
            reason: "provider-verify-failed",
          },
        });
        return;
      }
    }

    const chargedPriceGhs =
      typeof meta.priceGhs === "number" ? meta.priceGhs : Number(payment.amount);
    const months = typeof meta.months === "number" ? meta.months : null;
    const activated = await activateDigitalCardFromPayment({
      userId,
      cardId,
      planId,
      amountGhs: Number(payment.amount),
      paymentId: payment.id,
      chargedPriceGhs,
      months,
    });
    if (!activated) {
      console.error("[smartcard.activate] payment succeeded but card stayed offline", payment.id, cardId);
      await recordCeleCardLifecycleEvent({
        cardId,
        kind: "ActivationFailed",
        meta: { paymentId: payment.id, planId, amountGhs: Number(payment.amount) },
      });
    }
  }

  private async onPaymentSuccess(payment: {
    id: string;
    reference: string;
    purpose: PaymentPurpose;
    amount: unknown;
    currency: string;
    metadata: unknown;
    ticketOrderId: string | null;
    campaignId: string | null;
  }) {
    if (payment.ticketOrderId) {
      const order = await prisma.ticketOrder.findUnique({
        where: { id: payment.ticketOrderId },
        select: { id: true, totalAmount: true, currency: true },
      });
      if (order) {
        const match = paymentMatchesTicketOrder({
          orderAmount: order.totalAmount,
          orderCurrency: order.currency,
          paymentAmount: payment.amount,
          paymentCurrency: payment.currency,
        });
        if (!match.ok) {
          console.error("[tickets.payment-mismatch]", payment.ticketOrderId, match.error);
          return;
        }
      }
      const { ticketService } = await import("@/services/tickets/ticket.service");
      await ticketService.confirmPurchase(payment.ticketOrderId);
    }

    const metaEarly = payment.metadata as Record<string, unknown> | null;
    if (metaEarly?.kind === "celecard-concierge") {
      const orderId = typeof metaEarly.orderId === "string" ? metaEarly.orderId : "";
      if (orderId) {
        const { markConciergePaid } = await import(
          "@/services/digital-business-card/concierge.service"
        );
        await markConciergePaid({
          orderId,
          paymentId: payment.id,
          paymentReference: payment.reference,
          amountGhs: Number(payment.amount),
        });
      }
      return;
    }
    if (metaEarly?.kind === SMARTCARD_PAYMENT_KIND) {
      await this.fulfillCeleYouFromPayment(payment.id);
      return;
    }

    if (payment.purpose === "EVENT_GIFT") {
      // Gift money is credited by the gift service, which re-verifies the
      // transaction with the provider before touching the ledger. It must not
      // fall through to walletService.settlePayment or the gift would be
      // counted twice.
      const { giftPaymentService } = await import("@/services/gifts/gift-payment.service");
      const gift = await prisma.eventGiftPayment.findUnique({
        where: { paymentId: payment.id },
        select: { reference: true },
      });
      if (gift) {
        try {
          await giftPaymentService.fulfilFromProvider(gift.reference, "payment_webhook");
        } catch (error) {
          // A mismatch parks the gift as DISPUTED for a human to look at. We
          // swallow it here so the provider gets a 200 and stops retrying a
          // delivery that will never succeed.
          console.error("[gifts.fulfil]", gift.reference, error);
        }
      }
      return;
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
        const { unlockPaidInvitationPackage } = await import(
          "@/services/packages/unlock-paid-package.service"
        );
        await unlockPaidInvitationPackage(orderId);
        if (order?.user?.email) {
          const locale = (await languageService.getUserPreference(order.userId)) ?? "en";
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

  private async recordCeleYouCheckoutFailed(payment: {
    id: string;
    reference: string;
    metadata: unknown;
  }) {
    const meta = payment.metadata as Record<string, unknown> | null;
    if (meta?.kind !== SMARTCARD_PAYMENT_KIND) return;
    const cardId = typeof meta.cardId === "string" ? meta.cardId : "";
    if (!cardId) return;
    const { recordCeleCardLifecycleEvent } = await import(
      "@/services/digital-business-card/digital-business-card.service"
    );
    await recordCeleCardLifecycleEvent({
      cardId,
      kind: "CheckoutFailed",
      meta: {
        paymentId: payment.id,
        reference: payment.reference,
        planId: typeof meta.planId === "string" ? meta.planId : null,
      },
    });
  }

  getAdapter(provider: PaymentProvider) {
    return this.adapters[provider];
  }

  detectWebhookProvider(headers: Headers, queryProvider?: string | null): PaymentProvider | null {
    if (
      queryProvider === "PAYSTACK" ||
      queryProvider === "FLUTTERWAVE" ||
      queryProvider === "HUBTEL" ||
      queryProvider === "STRIPE"
    ) {
      return queryProvider;
    }
    if (headers.get("x-paystack-signature")) return "PAYSTACK";
    if (headers.get("stripe-signature")) return "STRIPE";
    if (headers.get("verif-hash")) return "FLUTTERWAVE";
    if (headers.get("x-hubtel-signature") || headers.get("x-hubtel-secret")) return "HUBTEL";
    return null;
  }
}

export const paymentService = new PaymentService();
