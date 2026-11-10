import { DEMO_CARD_NFC_TOKEN, DEMO_CARD_PUBLIC_TOKEN } from "@/lib/digital-business-card/demo-card";
import { smartCardNfcUrl, smartCardShortUrl } from "@/lib/digital-business-card/product";
import { digitalCardIdentityUrl } from "@/lib/digital-business-card/types";

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
export function celeYouShareIdentity(input: CeleYouShareIdentityInput): CeleYouShareIdentity {
  return {
    slug: input.slug,
    publicToken: input.publicToken,
    nfcToken: input.nfcToken,
    profileUrl: digitalCardIdentityUrl(input.slug, input.origin),
    qrUrl: smartCardShortUrl(input.publicToken, input.origin),
    nfcUrl: smartCardNfcUrl(input.nfcToken, input.origin),
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
