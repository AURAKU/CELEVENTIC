/**
 * Honest Web NFC capability detection.
 * Web NFC is primarily Chrome on Android, never claim “NFC ready” universally.
 */

export type NfcWriteSupport = {
  /** Browser exposes Web NFC write API */
  canWrite: boolean;
  /** Human-readable guidance for the current environment */
  guidance: string;
  platformHint: "android-chrome" | "ios" | "desktop" | "unknown";
};

export function detectNfcWriteSupport(
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): NfcWriteSupport {
  if (!nav) {
    return {
      canWrite: false,
      guidance: "Open this page on your phone to program an NFC card.",
      platformHint: "unknown",
    };
  }

  const ua = nav.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const hasNfc = "NDEFReader" in globalThis || Boolean((nav as Navigator & { nfc?: unknown }).nfc);

  if (isIos) {
    return {
      canWrite: false,
      guidance: "Copy the NFC link to program a card, or share the QR.",
      platformHint: "ios",
    };
  }

  if (hasNfc && isAndroid) {
    return {
      canWrite: true,
      guidance: "Hold a blank NFC card to the back of this phone, then tap Write.",
      platformHint: "android-chrome",
    };
  }

  if (isAndroid && !hasNfc) {
    return {
      canWrite: false,
      guidance: "Copy the NFC link to program a card, or share the QR.",
      platformHint: "android-chrome",
    };
  }

  return {
    canWrite: false,
    guidance: "Copy the NFC link to program a card, or share the QR.",
    platformHint: "desktop",
  };
}
