import { randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "@/lib/crypto/sha256-hex";
import {
  listDigitalCardReachItems,
  normalizeSocials,
  type DigitalCardReachItem,
  type DigitalCardSocials,
} from "@/lib/digital-business-card/socials";
import {
  lockedReachPlaceholder,
  readReachVisibilityMap,
  visibilityForItem,
} from "@/lib/digital-business-card/privacy-preview";

export {
  applyReachVisibilityPreview,
  lockedReachPlaceholder,
  normalizeReachVisibility,
  readReachVisibilityMap,
  REACH_VISIBILITY,
  visibilityForItem,
  type ReachVisibility,
} from "@/lib/digital-business-card/privacy-preview";

export const ACCESS_CODE_KINDS = ["DIGITS", "LETTERS"] as const;
export type AccessCodeKind = (typeof ACCESS_CODE_KINDS)[number];

export function normalizeAccessCode(raw: string): { kind: AccessCodeKind; code: string } | null {
  const value = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^[0-9]{4}$/.test(value)) return { kind: "DIGITS", code: value };
  if (/^[A-Z]{4}$/.test(value)) return { kind: "LETTERS", code: value };
  return null;
}

export function accessCodePepper(): string {
  return process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "celecard-dev-pepper";
}

export function hashCeleCardAccessCode(cardId: string, code: string, pepper = accessCodePepper()): string {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return sha256Hex(`${pepper}:celecard-code:${cardId}:invalid`);
  return sha256Hex(`${pepper}:celecard-code:${cardId}:${normalized.kind}:${normalized.code}`);
}

export function hashCeleCardGrantToken(token: string, pepper = accessCodePepper()): string {
  return sha256Hex(`${pepper}:celecard-grant:${token}`);
}

export function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function newGrantToken(): string {
  return randomBytes(32).toString("hex");
}

export function celeCardGrantCookieName(cardId: string): string {
  return `ccg_${cardId}`;
}

export type GuestReachBuildInput = {
  id: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socials?: unknown;
};

export function buildGuestReach(
  card: GuestReachBuildInput,
  grantedItemKeys: Iterable<string> = []
): {
  guestReach: DigitalCardReachItem[];
  socials: DigitalCardSocials;
  email: string | null;
  phone: string | null;
  website: string | null;
} {
  const granted = new Set([...grantedItemKeys].filter(Boolean));
  const socials = normalizeSocials(card.socials);
  const visibility = readReachVisibilityMap(socials);
  const full = listDigitalCardReachItems({
    email: card.email,
    phone: card.phone,
    website: card.website,
    socials,
  });

  const guestReach: DigitalCardReachItem[] = [];
  const allowedIds = new Set<string>();

  for (const item of full) {
    const mode = visibilityForItem(item.id, visibility);
    if (mode === "PUBLIC" || granted.has(item.id)) {
      guestReach.push(item);
      allowedIds.add(item.id);
      continue;
    }
    guestReach.push(lockedReachPlaceholder(item, mode));
  }

  const redacted = redactSocials(socials, full, allowedIds);
  return {
    guestReach,
    socials: redacted,
    email: allowedIds.has("email-0") ? card.email?.trim() || null : firstAllowed(full, allowedIds, "email"),
    phone: allowedIds.has("phone-0") ? card.phone?.trim() || null : firstAllowed(full, allowedIds, "phone"),
    website: allowedIds.has("website-0") ? card.website?.trim() || null : firstAllowed(full, allowedIds, "website"),
  };
}

function firstAllowed(items: DigitalCardReachItem[], allowed: Set<string>, brand: string): string | null {
  const match = items.find((item) => item.brand === brand && allowed.has(item.id));
  const value = match?.copyValue?.trim() || match?.title?.trim() || "";
  return value || null;
}

function allowedIndexes(items: DigitalCardReachItem[], allowed: Set<string>, brand: string): Set<number> {
  const indexes = new Set<number>();
  for (const item of items) {
    if (item.brand !== brand || !allowed.has(item.id)) continue;
    const index = Number(item.id.slice(brand.length + 1));
    if (Number.isInteger(index) && index >= 0) indexes.add(index);
  }
  return indexes;
}

function filterSlots<T>(values: T[] | undefined, keep: Set<number>): T[] | undefined {
  if (!values?.length) return undefined;
  const next = values.filter((_, index) => keep.has(index));
  return next.length ? next : undefined;
}

function redactSocials(
  socials: DigitalCardSocials,
  items: DigitalCardReachItem[],
  allowed: Set<string>
): DigitalCardSocials {
  const next: DigitalCardSocials = { ...socials };
  delete next.reachVisibility;

  const emailKeep = allowedIndexes(items, allowed, "email");
  next.emails = filterSlots(next.emails, emailKeep);
  next.emailTags = filterSlots(next.emailTags, emailKeep);
  if (!next.emails) delete next.emails;
  if (!next.emailTags) delete next.emailTags;

  const phoneKeep = allowedIndexes(items, allowed, "phone");
  next.phones = filterSlots(next.phones, phoneKeep);
  next.phoneTags = filterSlots(next.phoneTags, phoneKeep);
  if (!next.phones) delete next.phones;
  if (!next.phoneTags) delete next.phoneTags;

  const siteKeep = allowedIndexes(items, allowed, "website");
  next.websites = filterSlots(next.websites, siteKeep);
  if (!next.websites) delete next.websites;

  const brands = new Set(items.map((item) => item.brand));
  for (const brand of brands) {
    if (brand === "email" || brand === "phone" || brand === "website") continue;
    const keep = allowedIndexes(items, allowed, brand);
    const current = next[brand as keyof DigitalCardSocials];
    if (typeof current === "string") {
      if (!keep.has(0)) delete next[brand as keyof DigitalCardSocials];
      continue;
    }
    if (Array.isArray(current)) {
      const filtered = filterSlots(current as string[], keep);
      if (filtered) (next as Record<string, unknown>)[brand] = filtered;
      else delete next[brand as keyof DigitalCardSocials];
    }
  }

  if (next.payQr) {
    const payQr: Record<string, string> = {};
    for (const [key, url] of Object.entries(next.payQr)) {
      const split = key.lastIndexOf("-");
      if (split < 1) continue;
      const brand = key.slice(0, split);
      const index = Number(key.slice(split + 1));
      if (typeof url === "string" && allowed.has(`${brand}-${index}`)) payQr[key] = url;
    }
    if (Object.keys(payQr).length) next.payQr = payQr;
    else delete next.payQr;
  }
  return next;
}

export function guestReachLeaksDestination(items: DigitalCardReachItem[]): boolean {
  return items.some(
    (item) =>
      item.locked &&
      Boolean(item.href || item.copyValue || item.qrUrl || item.appHref || item.androidIntent)
  );
}
