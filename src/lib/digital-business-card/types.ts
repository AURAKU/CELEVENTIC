import type { DigitalCardThemeId } from "./themes";
import type { DigitalCardReachItem, DigitalCardSocials } from "./socials";

export type { DigitalCardSocials, DigitalCardSocialKey } from "./socials";
export {
  normalizeSocials,
  compactDigitalCardSocials,
  digitalCardSocialHref,
  listDigitalCardReachItems,
  collectCardEmails,
  collectCardPhones,
  collectCardWebsites,
  toDigitalCardSocialForm,
  socialValueList,
} from "./socials";

export type DigitalCardSubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "INACTIVE";

export type DigitalCardPresentationMode = "live" | "courtesy" | "suspended" | "unavailable";

export type DigitalCardPublicPayload = {
  id: string;
  slug: string;
  publicToken: string;
  displayName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials: DigitalCardSocials;
  themeId: DigitalCardThemeId;
  avatarUrl: string | null;
  /** Optional public pronouns. Never Mr, Mrs, or invented titles. */
  pronouns: string | null;
  nfcEnabled: boolean;
  connectBackEnabled: boolean;
  defaultMode: string;
  isLive: boolean;
  /** live = full public card. courtesy = sanitized Continuity Experience. */
  presentationMode?: DigitalCardPresentationMode;
  /** Public finishing dummy. Never write Connect Back or view counts. */
  isDemo?: boolean;
  /** Privacy-filtered taps. Prefer this on guest pages instead of rebuilding from socials. */
  guestReach?: DigitalCardReachItem[];
};

export { DIGITAL_CARD_MONTHLY_PRICE_GHS } from "./plans";
/** Studio design window. The public card stays offline until a paid plan is active. */
export const DIGITAL_CARD_TRIAL_DAYS = 14;

export const DIGITAL_CARD_PUBLIC_PATH = "/card";

export function digitalCardPublicUrl(slug: string, origin?: string): string {
  const path = `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export type DigitalCardQrImageOptions = {
  size?: number;
  format?: "png" | "svg";
  download?: boolean;
  /** guide = black and white, no logo. brand = Celeventic mark. */
  variant?: "guide" | "brand";
  background?: "white" | "transparent";
};

/** Camera-safe QR. Guide modules stay black and white. The card overlays the portrait or house mark. */
export function digitalCardQrImageSrc(
  shareUrl: string,
  sizeOrOptions: number | DigitalCardQrImageOptions = 1024
): string {
  const options = typeof sizeOrOptions === "number" ? { size: sizeOrOptions } : sizeOrOptions;
  const size = options.size ?? 1024;
  const mode = options.variant === "brand" ? "brand" : "guide";
  const params = [`data=${encodeURIComponent(shareUrl)}`, `size=${size}`, `mode=${mode}`];
  if (options.format === "svg") params.push("format=svg");
  if (options.download) params.push("download=1");
  if (options.background === "transparent") params.push("bg=transparent");
  return `/api/qr/image?${params.join("&")}`;
}

export function readDigitalCardPronouns(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as Record<string, unknown>).pronouns;
  if (typeof v !== "string") return null;
  const pronouns = v.trim();
  return pronouns ? pronouns : null;
}
