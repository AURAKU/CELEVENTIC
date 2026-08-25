/**
 * Honest Web NFC capability detection.
 * Web NFC is primarily Chrome on Android — never claim “NFC ready” universally.
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
      guidance: "Open this page on a compatible phone to write NFC tags.",
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
      guidance:
        "iPhone browsers cannot write NFC tags. Use a pre-programmed Celeventic NFC card, QR, Wallet QR, or AirDrop/share link.",
      platformHint: "ios",
    };
  }

  if (hasNfc && isAndroid) {
    return {
      canWrite: true,
      guidance: "Hold a blank NFC tag to the back of your phone, then tap Write.",
      platformHint: "android-chrome",
    };
  }

  if (isAndroid && !hasNfc) {
    return {
      canWrite: false,
      guidance:
        "This browser does not support Web NFC. Use Chrome on Android, or copy the short link into an NFC writer app.",
      platformHint: "android-chrome",
    };
  }

  return {
    canWrite: false,
    guidance:
      "Web NFC writing works in Chrome on Android. On this device, copy the short NFC link or use a pre-programmed tag.",
    platformHint: "desktop",
  };
}
