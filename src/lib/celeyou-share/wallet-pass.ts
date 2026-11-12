/**
 * Wallet card CTA on the cardholder Share desk.
 * Guests see only uploaded payment channels, wallets, and bank details.
 * Signed Apple Wallet (.pkpass) and Google Wallet issuer files need certificates
 * we do not ship in this MVP. It does not enable phone-to-phone NFC URL transfer.
 */

export const WALLET_PASS_CTA = "Wallet card";

export function appleWalletSigningConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(env.CELEYOU_APPLE_PASS_CERT && env.CELEYOU_APPLE_PASS_KEY);
}

export function googleWalletSigningConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(env.CELEYOU_GOOGLE_WALLET_ISSUER && env.CELEYOU_GOOGLE_WALLET_KEY);
}

export function walletPassClaimsPhoneNfc(): false {
  return false;
}

export function walletPassGuidance(
  env: NodeJS.ProcessEnv = process.env
): string {
  if (appleWalletSigningConfigured(env) || googleWalletSigningConfigured(env)) {
    return "Add this QR to Wallet when your issuer file is ready. Recipients still open the HTTPS profile. Wallet NFC does not send a CeleYou link by touching two phones.";
  }
  return "Keep this QR on your lock screen or Home Screen. Recipients scan it and open the public profile with no CeleYou app. Signed Apple Wallet and Google Wallet files need issuer certificates. They would not enable phone to phone NFC.";
}

export type CeleYouWalletPassPayload = {
  displayName: string;
  title: string | null;
  company: string | null;
  profileUrl: string;
  qrUrl: string;
  phoneNfcTransfer: false;
};

export function buildCeleYouWalletPass(input: {
  displayName: string;
  title?: string | null;
  company?: string | null;
  profileUrl: string;
  qrUrl: string;
}): CeleYouWalletPassPayload {
  return {
    displayName: input.displayName,
    title: input.title ?? null,
    company: input.company ?? null,
    profileUrl: input.profileUrl,
    qrUrl: input.qrUrl,
    phoneNfcTransfer: false,
  };
}
