import crypto from "crypto";

/**
 * Paystack signs the raw request body with HMAC-SHA512 of the secret key.
 * Compare in constant time. Never hash a re-serialised JSON object: key order
 * would change the digest.
 */
export function paystackHmacValid(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature || typeof rawBody !== "string") return false;
  const digest = crypto.createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const provided = Buffer.from(signature, "utf8");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

export type PaystackWebhookKind = "charge" | "lifecycle" | "ignored";

export interface ParsedPaystackWebhook {
  event: string | null;
  reference: string | null;
  kind: PaystackWebhookKind;
  successful: boolean;
}

/**
 * Only charge.success / charge.failed confirm or fail a payment. Refund,
 * dispute and transfer events use a different shape and must not flip a
 * settled ticket order back to FAILED.
 */
export function parsePaystackWebhook(payload: unknown): ParsedPaystackWebhook {
  const body = payload as {
    event?: string;
    data?: {
      reference?: string;
      status?: string;
      transaction?: { reference?: string };
      transaction_reference?: string;
    };
  };
  const event = typeof body?.event === "string" ? body.event : null;
  if (!event) {
    return { event: null, reference: null, kind: "ignored", successful: false };
  }

  if (event === "charge.success" || event === "charge.failed") {
    return {
      event,
      reference: body.data?.reference ?? null,
      kind: "charge",
      successful: event === "charge.success",
    };
  }

  const lifecycle = [
    "charge.dispute.create",
    "charge.dispute.remind",
    "refund.processed",
    "refund.failed",
    "refund.pending",
  ];
  if (lifecycle.includes(event)) {
    const reference =
      body.data?.transaction?.reference ??
      body.data?.transaction_reference ??
      body.data?.reference ??
      null;
    return { event, reference, kind: "lifecycle", successful: false };
  }

  return {
    event,
    reference: body.data?.reference ?? null,
    kind: "ignored",
    successful: false,
  };
}

export function paystackAmountsMatch(expectedMinor: number, providerMinor: unknown): boolean {
  return typeof providerMinor === "number" && Math.trunc(providerMinor) === expectedMinor;
}
