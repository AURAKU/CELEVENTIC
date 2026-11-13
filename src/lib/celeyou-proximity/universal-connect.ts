import { shareCeleYouProfile, type ShareProfileResult } from "@/lib/celeyou-share/engine";
import { detectTapPlatform, type TapPlatform } from "@/lib/celeyou-proximity/capabilities";
import { tapJoinPath } from "@/lib/celeyou-proximity/product";

export const TAP_TO_SHARE_CTA = "Tap to Share";
export const SCAN_TO_CONNECT_CTA = "Scan to Connect";
export const SHARE_LINK_CTA = "Share Link";
export const UNIVERSAL_CONNECT_KICKER = "Universal Connect";
export const UNIVERSAL_CONNECT_SUPPORT =
  "Share with iPhone or Android. Recipients open the page in their browser. No CeleYou account or app is required.";
export const UNIVERSAL_SAVE_LEAD =
  "Save Contact opens your phone’s contact flow. CeleYou does not add a contact by itself.";
export const TAP_TO_SHARE_HINT =
  "This opens your phone’s share sheet. AirDrop or Quick Share can appear there. CeleYou does not start them itself.";
export const SCAN_TO_CONNECT_HINT =
  "Anyone can scan this QR with their camera. It expires with this session. No account is required.";
export const SHARE_LINK_HINT =
  "Copy or send this link. It works only while this connection is open.";
export const TAP_TO_SHARE_DESKTOP_HINT =
  "This computer copies the connection link. On a phone, Tap to Share opens the system share sheet.";

export type UniversalConnectActionId = "tap-to-share" | "scan-to-connect" | "share-link";

export const UNIVERSAL_CONNECT_ACTIONS: readonly UniversalConnectActionId[] = [
  "tap-to-share",
  "scan-to-connect",
  "share-link",
] as const;

export type UniversalConnectPair = {
  pair: "iPhone to iPhone" | "iPhone to Android" | "Android to iPhone" | "Android to Android";
  host: string;
  guest: string;
  primary: string;
  fallback: string;
  guestNeedsApp: false;
  guestNeedsAccount: false;
};

export const UNIVERSAL_CONNECT_DEVICE_MATRIX: readonly UniversalConnectPair[] = [
  {
    pair: "iPhone to iPhone",
    host: "iOS Safari",
    guest: "iOS Safari",
    primary: "Tap to Share opens the iOS share sheet. AirDrop can appear there. Scan to Connect and Share Link always work.",
    fallback: "If AirDrop is off, the guest scans the QR or opens the copied link.",
    guestNeedsApp: false,
    guestNeedsAccount: false,
  },
  {
    pair: "iPhone to Android",
    host: "iOS Safari",
    guest: "Android Chrome",
    primary: "Scan to Connect and Share Link are the reliable paths. Quick Share will not appear on iPhone.",
    fallback: "The Android guest opens the HTTPS /tap page in Chrome. No CeleYou install.",
    guestNeedsApp: false,
    guestNeedsAccount: false,
  },
  {
    pair: "Android to iPhone",
    host: "Android Chrome",
    guest: "iOS Safari",
    primary: "Tap to Share may show Nearby Share or Quick Share. The iPhone guest opens the HTTPS link in Safari.",
    fallback: "Scan to Connect and Share Link work when nearby sharing is off.",
    guestNeedsApp: false,
    guestNeedsAccount: false,
  },
  {
    pair: "Android to Android",
    host: "Android Chrome",
    guest: "Android Chrome",
    primary: "Tap to Share may show Quick Share. Scan to Connect and Share Link always work.",
    fallback: "Do not depend on Android Beam. It is obsolete.",
    guestNeedsApp: false,
    guestNeedsAccount: false,
  },
] as const;

export function universalConnectActionOrder(platform: TapPlatform): UniversalConnectActionId[] {
  if (platform === "desktop") {
    return ["scan-to-connect", "share-link", "tap-to-share"];
  }
  return ["tap-to-share", "scan-to-connect", "share-link"];
}

export function universalConnectHint(action: UniversalConnectActionId, platform: TapPlatform): string {
  if (action === "tap-to-share") {
    return platform === "desktop" ? TAP_TO_SHARE_DESKTOP_HINT : TAP_TO_SHARE_HINT;
  }
  if (action === "scan-to-connect") return SCAN_TO_CONNECT_HINT;
  return SHARE_LINK_HINT;
}

export function tapSessionJoinUrl(origin: string, secret: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${tapJoinPath(secret)}`;
}

export function tapSessionSecretFromView(session: {
  pairingToken?: string | null;
  joinCode?: string | null;
} | null | undefined): string {
  const token = session?.pairingToken?.trim();
  if (token && token.length >= 20) return token;
  return session?.joinCode?.trim() || "";
}

const PRIVATE_QUERY = /(^|[?&#])(email|phone|mail|tel|visitor|password|token_raw)=/i;

export function tapSessionUrlIsPublicJoin(url: string): boolean {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] === "tap" && Boolean(parts[1]) && parts.length === 2;
  } catch {
    return false;
  }
}

export function tapSessionUrlContainsPrivateField(url: string): boolean {
  if (!url) return true;
  if (PRIVATE_QUERY.test(url)) return true;
  if (/mailto:|tel:/i.test(url)) return true;
  try {
    const parsed = new URL(url);
    if ([...parsed.searchParams.keys()].some((key) => /email|phone|mail|visitor/i.test(key))) {
      return true;
    }
    return /@/.test(parsed.pathname);
  } catch {
    return /@/.test(url);
  }
}

export function tapSessionShareTitle(displayName: string): string {
  const name = displayName.trim() || "CeleYou";
  return `Connect with ${name} on CeleYou`;
}

export function tapSessionShareText(displayName: string, url: string): string {
  const name = displayName.trim() || "CeleYou";
  return `${name} is sharing a CeleYou connection. Open the link to view their card, save their contact, or send yours back. No app or account required.\n${url}`;
}

function rejectUnsafeSessionUrl(url: string): boolean {
  return !tapSessionUrlIsPublicJoin(url) || tapSessionUrlContainsPrivateField(url);
}

export async function shareTapSession(
  input: { url: string; displayName: string },
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): Promise<ShareProfileResult> {
  if (rejectUnsafeSessionUrl(input.url)) return "unavailable";
  return shareCeleYouProfile(
    {
      title: tapSessionShareTitle(input.displayName),
      text: tapSessionShareText(input.displayName, input.url),
      url: input.url,
    },
    nav
  );
}

export async function copyTapSession(
  url: string,
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): Promise<ShareProfileResult> {
  if (rejectUnsafeSessionUrl(url)) return "unavailable";
  try {
    if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
      await Promise.race([
        nav.clipboard.writeText(url),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("clipboard-timeout")), 1200);
        }),
      ]);
      return "copied";
    }
  } catch {
    return "unavailable";
  }
  return "unavailable";
}

export function detectUniversalConnectPlatform(
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): TapPlatform {
  return detectTapPlatform(nav);
}
