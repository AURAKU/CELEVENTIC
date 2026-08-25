import type { DigitalCardThemeId } from "./themes";

export type DigitalCardSocials = {
  linkedin?: string;
  website?: string;
  instagram?: string;
  x?: string;
  facebook?: string;
  whatsapp?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
};

export type DigitalCardSubscriptionStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "INACTIVE";

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
  nfcEnabled: boolean;
  connectBackEnabled: boolean;
  defaultMode: string;
  isLive: boolean;
};

/** Monthly plan keeps the public card URL live for anyone you share with. */
export const DIGITAL_CARD_MONTHLY_PRICE_GHS = 49;
export const DIGITAL_CARD_TRIAL_DAYS = 14;

export const DIGITAL_CARD_PUBLIC_PATH = "/card";

export function digitalCardPublicUrl(slug: string, origin?: string): string {
  const path = `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function normalizeSocials(raw: unknown): DigitalCardSocials {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: DigitalCardSocials = {};
  const keys: (keyof DigitalCardSocials)[] = [
    "linkedin",
    "website",
    "instagram",
    "x",
    "facebook",
    "whatsapp",
    "youtube",
    "tiktok",
    "github",
  ];
  for (const key of keys) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}
