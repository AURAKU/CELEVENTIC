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
        "This iPhone can read a physical CeleYou tag. Safari cannot turn the phone into a tag for phone to phone NFC. Show the QR or share the link instead.",
      platformHint: "ios",
    };
  }

  if (hasNfc && isAndroid) {
    return {
      canWrite: true,
      guidance:
        "Hold a blank NFC tag to the back of this phone, then tap Write. Phone to phone NFC is still device specific. QR and share stay universal.",
      platformHint: "android-chrome",
    };
  }

  if (isAndroid && !hasNfc) {
    return {
      canWrite: false,
      guidance:
        "This browser cannot write NFC tags. Use Chrome on Android, a pre-programmed tag, or show the QR.",
      platformHint: "android-chrome",
    };
  }

  return {
    canWrite: false,
    guidance:
      "Physical NFC cards open this same public link. Browser NFC writing works in Chrome on Android only. On this device, copy the link or show the QR.",
    platformHint: "desktop",
  };
}
