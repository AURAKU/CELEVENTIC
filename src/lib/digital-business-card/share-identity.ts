import {
  celeYouGuestOrigin,
  celeYouProductionOrigin,
  isApprovedCeleYouShareOrigin,
  isLocalHost,
  isPrivateNetworkHost,
} from "@/lib/app-url";
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

function isCeleYouGuestPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !parts[1]) return false;
  return parts[0] === "c" || parts[0] === "n" || parts[0] === "card" || parts[0] === "u";
}

export function isCeleYouCameraScanUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!isApprovedCeleYouShareOrigin(url)) return false;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] === SMARTCARD_SHORT_PATH.slice(1) && parts.length === 2 && Boolean(parts[1]);
  } catch {
    return false;
  }
}

/** True when a guest URL is HTTPS, on an approved host, and has no development leakage. */
export function isCeleYouProductionGuestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!isApprovedCeleYouShareOrigin(url)) return false;
    if (parsed.searchParams.has("access") || parsed.username) return false;
    return isCeleYouGuestPath(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Where a scan should land. Use the host that received /c or /n when it is an
 * approved live Celeventic origin. Localhost and private IPs never leak into
 * the next hop.
 */
export function celeYouScanLandingUrl(slug: string, requestOrigin?: string | null): string {
  return digitalCardPublicUrl(slug, celeYouProductionOrigin(requestOrigin));
}

/** If a QR generator received a relative or unsafe CeleYou path, lift it onto the live origin. */
export function celeYouAbsoluteGuestPayload(raw: string, origin?: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const live = celeYouGuestOrigin(origin);
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      const path = `${parsed.pathname}${parsed.search}`;
      if (isCeleYouGuestPath(parsed.pathname)) {
        return `${live}${path}`;
      }
      if (isLocalHost(parsed.hostname) || isPrivateNetworkHost(parsed.hostname)) {
        return `${live}${path}`;
      }
      return value;
    } catch {
      return value;
    }
  }
  if (isCeleYouGuestPath(value.split("?")[0] ?? "") || value.startsWith("/c/") || value.startsWith("/n/") || value.startsWith("/card/") || value.startsWith("/u/")) {
    return `${live}${value.startsWith("/") ? value : `/${value}`}`;
  }
  return null;
}

/** Profile, Smart QR, and NFC card use different URLs and the same public identity. */
export function shareArtifactsLandOnSameProfile(identity: CeleYouShareIdentity): boolean {
  const slug = identity.slug.trim();
  if (!slug) return false;
  const encoded = encodeURIComponent(slug);
  try {
    return (
      identity.profileUrl.includes(`/u/${encoded}`) &&
      /\/c\/[^/]+$/.test(new URL(identity.qrUrl).pathname) &&
      /\/n\/[^/]+$/.test(new URL(identity.nfcUrl).pathname) &&
      celeYouScanLandingUrl(slug).includes(`/card/${encoded}`)
    );
  } catch {
    return false;
  }
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
