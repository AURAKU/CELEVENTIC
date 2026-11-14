import crypto from "crypto";

/**
 * Stripe Checkout helpers for Alipay and WeChat Pay.
 * HMAC follows Stripe's t=,v1= signed-payload format.
 */
export function stripeSignatureValid(rawBody: string, header: string, secret: string): boolean {
  if (!rawBody || !header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const idx = piece.indexOf("=");
      return idx === -1 ? ["", ""] : [piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  const signed = `${timestamp}.${rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function parseStripeCheckoutEvent(payload: unknown): {
  reference: string | null;
  successful: boolean;
  sessionId: string | null;
} | null {
  const body = payload as {
    type?: string;
    data?: {
      object?: {
        id?: string;
        client_reference_id?: string;
        payment_status?: string;
        status?: string;
        metadata?: Record<string, string>;
      };
    };
  };
  const type = body.type ?? "";
  const obj = body.data?.object;
  if (!obj) return null;
  const reference =
    obj.client_reference_id ||
    obj.metadata?.celeventic_reference ||
    null;
  if (type === "checkout.session.async_payment_failed") {
    return { reference, successful: false, sessionId: obj.id ?? null };
  }
  if (type === "checkout.session.async_payment_succeeded" || type === "payment_intent.succeeded") {
    return { reference, successful: true, sessionId: obj.id ?? null };
  }
  if (type === "checkout.session.completed") {
    if (obj.payment_status === "paid") {
      return { reference, successful: true, sessionId: obj.id ?? null };
    }
    // Alipay and WeChat Pay often complete the session before funds arrive.
    return null;
  }
  return null;
}
