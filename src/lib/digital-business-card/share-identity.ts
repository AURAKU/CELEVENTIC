import { celeYouGuestOrigin, isLocalHost } from "@/lib/app-url";
import { DEMO_CARD_NFC_TOKEN, DEMO_CARD_PUBLIC_TOKEN } from "@/lib/digital-business-card/demo-card";
import { SMARTCARD_SHORT_PATH, smartCardNfcUrl, smartCardShortUrl } from "@/lib/digital-business-card/product";
import { digitalCardIdentityUrl, digitalCardPublicUrl } from "@/lib/digital-business-card/types";

/** Dummy walkthrough tokens. Real cardholders never receive these. */
export const RESERVED_CELEYOU_SHARE_TOKENS = new Set([
  DEMO_CARD_PUBLIC_TOKEN,
  DEMO_CARD_NFC_TOKEN,
  "demo",
]);

export function isReservedCeleYouShareToken(token?: string | null): boolean {
  if (!token) return false;
  return RESERVED_CELEYOU_SHARE_TOKENS.has(token.trim().toLowerCase());
}

export type CeleYouShareIdentityInput = {
  slug: string;
  publicToken: string;
  nfcToken: string;
  origin?: string;
};

export type CeleYouShareIdentity = {
  slug: string;
  publicToken: string;
  nfcToken: string;
  profileUrl: string;
  qrUrl: string;
  nfcUrl: string;
};

/**
 * One CeleYou has three distinct public artifacts:
 * profile URL (/u/{slug}), Smart QR (/c/{publicToken}), NFC tap (/n/{nfcToken}).
 * Tap-to-Connect sessions add a fourth, ephemeral join code.
 */
/**
 * Absolute URL encoded into every activated-card QR.
 * iPhone Camera, Android Camera / Google Lens, and Windows Camera open https links.
 * Localhost is never encoded. The bitmap stores /c/{token}, then the host sends
 * the guest to /card/{slug}.
 */
export function celeYouCameraScanUrl(publicToken: string, origin?: string): string {
  const token = publicToken.trim();
  if (!token) return "";
  return smartCardShortUrl(token, celeYouGuestOrigin(origin));
}

export function celeYouNfcScanUrl(nfcToken: string, origin?: string): string {
  const token = nfcToken.trim();
  if (!token) return "";
  return smartCardNfcUrl(token, celeYouGuestOrigin(origin));
}

export function isCeleYouCameraScanUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isLocalHost(parsed.hostname)) return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] === SMARTCARD_SHORT_PATH.slice(1) && parts.length === 2 && Boolean(parts[1]);
  } catch {
    return false;
  }
}

/**
 * Where a scan should land. Stay on the host that received /c or /n so the
 * phone browser opens the public profile without a second hop to another domain.
 */
export function celeYouScanLandingUrl(slug: string, requestOrigin?: string | null): string {
  const host = requestOrigin?.trim().replace(/\/$/, "") || "";
  const origin = host || celeYouGuestOrigin();
  return digitalCardPublicUrl(slug, origin);
}

/** If a QR generator received a relative CeleYou path, lift it onto the live origin. */
export function celeYouAbsoluteGuestPayload(raw: string, origin?: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (isLocalHost(parsed.hostname)) {
        return `${celeYouGuestOrigin(origin)}${parsed.pathname}${parsed.search}`;
      }
      return value;
    } catch {
      return value;
    }
  }
  if (
    value.startsWith("/c/") ||
    value.startsWith("/n/") ||
    value.startsWith("/card/") ||
    value.startsWith("/u/")
  ) {
    return `${celeYouGuestOrigin(origin)}${value}`;
  }
  return null;
}

export function celeYouShareIdentity(input: CeleYouShareIdentityInput): CeleYouShareIdentity {
  const origin = celeYouGuestOrigin(input.origin);
  return {
    slug: input.slug,
    publicToken: input.publicToken,
    nfcToken: input.nfcToken,
    profileUrl: digitalCardIdentityUrl(input.slug, origin),
    qrUrl: celeYouCameraScanUrl(input.publicToken, origin),
    nfcUrl: celeYouNfcScanUrl(input.nfcToken, origin),
  };
}

export function shareIdentityArtifactsAreUnique(input: {
  slug: string;
  publicToken: string;
  nfcToken: string;
}): boolean {
  const slug = input.slug.trim();
  const qr = input.publicToken.trim();
  const nfc = input.nfcToken.trim();
  if (!slug || !qr || !nfc) return false;
  if (isReservedCeleYouShareToken(qr) || isReservedCeleYouShareToken(nfc)) return false;
  return new Set([slug, qr, nfc]).size === 3;
}
