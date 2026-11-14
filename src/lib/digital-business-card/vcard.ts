import { celeYouGuestOrigin } from "@/lib/app-url";
import type { DigitalCardPublicPayload } from "./types";
import { DIGITAL_CARD_PUBLIC_PATH, digitalCardPublicUrl } from "./types";
import {
  brandReachLabel,
  collectCardWebsites,
  collectTaggedEmails,
  collectTaggedPhones,
  detectChatLinkKind,
  isLiveReachItem,
  isPayNetwork,
  listDigitalCardReachItems,
  parseBankAccount,
  websiteHref,
  type ContactKindTag,
  type DigitalCardReachItem,
} from "./socials";
import { parseCeleCardPlace } from "./maps";
import { isCeleCardPhotoUrl } from "./portraits";
import { callingCodeFromPhones, internationalTelHref } from "./phone-format";

export type VCardPhoto = {
  type: "JPEG" | "PNG";
  base64: string;
};

export type BuildVCardOptions = {
  cardUrl?: string | null;
  photo?: VCardPhoto | null;
};

export function vcardFileName(card: { slug?: string | null; displayName?: string | null }): string {
  const raw = (card.slug || card.displayName || "celecard").trim();
  const safe =
    raw
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "celecard";
  return `${safe}.vcf`;
}

export function digitalCardVcardPath(slug: string): string {
  return `${DIGITAL_CARD_PUBLIC_PATH}/${encodeURIComponent(slug)}/contact.vcf`;
}

const MAX_VCARD_PHOTO_CHARS = 60_000;
const PROFILE_PATH = /^\/(card|u)\/([^/]+)$/i;

/**
 * Permanent guest profile URL encoded into Contacts.
 * Always HTTPS on a Celeventic host. Never localhost, tokens, or private codes.
 */
export function celeYouContactProfileUrl(slug: string, origin?: string | null): string {
  return digitalCardPublicUrl(slug, celeYouGuestOrigin(origin));
}

/** Accept only a public /card/{slug} or /u/{slug} URL. Rewrite onto /card/{slug}. */
export function sanitizeCeleYouVcardUrl(value?: string | null, slug?: string | null): string | null {
  const fallback = slug?.trim() ? celeYouContactProfileUrl(slug) : null;
  if (!value?.trim()) return fallback;
  try {
    const parsed = new URL(value.trim());
    if (parsed.username || parsed.password) return fallback;
    const match = parsed.pathname.replace(/\/+$/, "").match(PROFILE_PATH);
    if (!match) return fallback;
    const pathSlug = decodeURIComponent(match[2] || "").trim();
    if (!pathSlug || /^(api|dashboard|admin|login|c|n)$/i.test(pathSlug)) return fallback;
    if (slug?.trim() && pathSlug !== slug.trim()) return fallback;
    if (parsed.search || parsed.hash) {
      return celeYouContactProfileUrl(pathSlug, parsed.origin);
    }
    if (parsed.protocol !== "https:") {
      return celeYouContactProfileUrl(pathSlug, parsed.origin);
    }
    return celeYouContactProfileUrl(pathSlug, parsed.origin);
  } catch {
    return fallback;
  }
}

/** How the .vcf should be handed to this browser. */
export function vcardDelivery(userAgent: string): {
  contentType: string;
  disposition: "inline" | "attachment";
} {
  const appleMobile =
    /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
  const android = /Android/i.test(userAgent);
  return {
    contentType: android ? "text/x-vcard; charset=utf-8" : "text/vcard; charset=utf-8",
    disposition: appleMobile ? "inline" : "attachment",
  };
}

export function vcardContentDisposition(disposition: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "") || "contact.vcf";
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Apple Contacts service names that fill the Social Profile row. */
const SOCIAL_PROFILE_TYPE: Record<string, string> = {
  linkedin: "linkedin",
  instagram: "instagram",
  facebook: "facebook",
  x: "twitter",
  youtube: "youtube",
  github: "github",
  tiktok: "tiktok",
  threads: "threads",
  snapchat: "snapchat",
  pinterest: "pinterest",
  reddit: "reddit",
  discord: "discord",
  bluesky: "bluesky",
  trendshub: "trendshub",
  twitch: "twitch",
  spotify: "spotify",
  applemusic: "applemusic",
  behance: "behance",
  dribbble: "dribbble",
  medium: "medium",
};

const CHAT_IM_SERVICE: Record<string, string> = {
  whatsapp: "WhatsApp",
  whatsappbusiness: "WhatsApp",
  telegram: "Telegram",
  signal: "Signal",
  messenger: "Facebook",
  wechat: "WeChat",
  line: "LINE",
  viber: "Viber",
};

const PAY_AS_URL = new Set([
  "paypal",
  "cashapp",
  "venmo",
  "wise",
  "revolut",
  "paystack",
  "flutterwave",
  "alipay",
  "chipper",
]);

export function buildVCard(card: DigitalCardPublicPayload, options: BuildVCardOptions = {}): string {
  const displayName = card.displayName.trim() || card.company?.trim() || "CeleYou";
  const { family, given } = vcardNameParts(displayName);
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//Celeventic//CeleYou//EN",
    `UID:celecard:${escapeVCard(card.id || card.slug)}`,
    `FN;CHARSET=UTF-8:${escapeVCard(displayName)}`,
    `N;CHARSET=UTF-8:${escapeVCard(family)};${escapeVCard(given)};;;`,
  ];
  if (card.company?.trim()) lines.push(`ORG;CHARSET=UTF-8:${escapeVCard(card.company.trim())}`);
  if (card.title?.trim()) lines.push(`TITLE;CHARSET=UTF-8:${escapeVCard(card.title.trim())}`);
  lines.push("CATEGORIES:CeleYou");

  const reach = unlockedReach(card);
  const seenTel = new Set<string>();
  const seenMail = new Set<string>();
  const seenUrls = new Set<string>();
  let item = 1;

  const vcardPhones = phonesForVCard(card, reach);
  const callingCode = callingCodeFromPhones(vcardPhones.map((entry) => entry.value));
  vcardPhones.forEach((entry, index) => {
    const number = compactPhone(entry.value, callingCode);
    if (!number || seenTel.has(digits(number))) return;
    seenTel.add(digits(number));
    lines.push(`TEL;${vcardTelType(entry.tag, index)}:${escapeVCard(number)}`);
  });

  emailsForVCard(card, reach).forEach((entry) => {
    const email = entry.value.trim();
    if (!email || seenMail.has(email.toLowerCase())) return;
    seenMail.add(email.toLowerCase());
    lines.push(`EMAIL;${vcardEmailType(entry.tag)}:${escapeVCard(email)}`);
  });

  websitesForVCard(card, reach).forEach((href, index) => {
    if (seenUrls.has(href)) return;
    seenUrls.add(href);
    lines.push(index === 0 ? `URL;TYPE=WORK:${escapeVCard(href)}` : `URL:${escapeVCard(href)}`);
  });

  const cardUrl = sanitizeCeleYouVcardUrl(options.cardUrl, card.slug);
  if (cardUrl && !seenUrls.has(cardUrl)) {
    seenUrls.add(cardUrl);
    lines.push(`item${item}.URL;TYPE=PREF:${escapeVCard(cardUrl)}`);
    lines.push(`item${item}.X-ABLabel:CeleYou`);
    item += 1;
  }

  const notes: string[] = [];
  if (card.pronouns?.trim()) {
    const pronouns = card.pronouns.trim();
    lines.push(`X-PRONOUNS;CHARSET=UTF-8:${escapeVCard(pronouns)}`);
    notes.push(`Pronouns: ${pronouns}`);
  }
  if (card.bio?.trim()) notes.push(card.bio.trim());

  const payNotes: string[] = [];

  for (const row of reach) {
    if (row.brand === "email" || row.brand === "phone" || row.brand === "website") continue;

    if (row.brand === "meeting") {
      const meeting = [row.title, row.subtitle].filter(Boolean).join(" · ");
      if (meeting) notes.push(meeting);
      continue;
    }

    if (row.brand === "location") {
      item = pushAddress(lines, item, row);
      continue;
    }

    if (row.brand === "bank" || (isPayNetwork(row.brand) && !PAY_AS_URL.has(row.brand))) {
      const payLine = payNoteLine(row);
      if (payLine) payNotes.push(payLine);
      continue;
    }

    const chatService = CHAT_IM_SERVICE[row.brand];
    if (chatService) {
      const kind = row.linkKind || detectChatLinkKind(row.brand, row.copyValue || row.href || row.title);
      if (kind === "number") {
        const number = compactPhone(row.copyValue || row.title || row.href);
        if (number) {
          if (!seenTel.has(digits(number))) {
            seenTel.add(digits(number));
            lines.push(`TEL;TYPE=CELL;TYPE=VOICE:${escapeVCard(number)}`);
          }
          item = pushIm(lines, item, chatService, `x-apple:${digits(number)}`);
          continue;
        }
      }
      const href = httpHref(row.href);
      if (href && (kind === "group" || kind === "channel")) {
        const label =
          kind === "group" ? `${brandReachLabel(row.brand)} Group` : `${brandReachLabel(row.brand)} Channel`;
        item = pushLabeledUrl(lines, item, seenUrls, href, label);
        continue;
      }
      const imValue = imHandle(row) || httpHref(row.href);
      if (imValue) item = pushIm(lines, item, chatService, imValue);
      continue;
    }

    const socialType = SOCIAL_PROFILE_TYPE[row.brand];
    if (socialType) {
      const href = httpHref(row.href);
      const user = profileHandle(row);
      if (!href && !user) continue;
      item = pushSocial(lines, item, socialType, brandReachLabel(row.brand), user, href || user);
      continue;
    }

    if (PAY_AS_URL.has(row.brand) || row.brand === "other") {
      const href = httpHref(row.href);
      const label = row.brand === "other" ? row.title || "Page" : brandReachLabel(row.brand);
      if (href) {
        item = pushLabeledUrl(lines, item, seenUrls, href, label);
      } else {
        const payLine = payNoteLine(row);
        if (payLine) payNotes.push(payLine);
      }
      continue;
    }

    const href = httpHref(row.href);
    if (href) {
      item = pushLabeledUrl(lines, item, seenUrls, href, brandReachLabel(row.brand));
      continue;
    }
    if (row.copyValue?.trim()) {
      notes.push(`${brandReachLabel(row.brand)}: ${row.copyValue.trim()}`);
    }
  }

  if (payNotes.length) {
    notes.push(["Pay", ...payNotes].join("\n"));
  }

  if (options.photo?.base64 && isCeleCardPhotoUrl(card.avatarUrl)) {
    const data = options.photo.base64.replace(/\s+/g, "");
    if (data.length > 0 && data.length <= MAX_VCARD_PHOTO_CHARS) {
      const type = options.photo.type === "PNG" ? "PNG" : "JPEG";
      lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${data}`);
    }
  }

  if (notes.length) lines.push(`NOTE;CHARSET=UTF-8:${escapeVCard(notes.join("\n"))}`);
  lines.push(`REV:${vcardRev()}`);
  lines.push("END:VCARD");
  return lines.map(foldVCardLine).join("\r\n") + "\r\n";
}

function unlockedReach(card: DigitalCardPublicPayload) {
  const items = Array.isArray(card.guestReach) ? card.guestReach : listDigitalCardReachItems(card);
  return items.filter((item) => !item.locked && isLiveReachItem(item));
}

function phonesForVCard(
  card: DigitalCardPublicPayload,
  reach: DigitalCardReachItem[]
): Array<{ value: string; tag: ContactKindTag | null }> {
  const fromReach = reach
    .filter((item) => item.brand === "phone")
    .map((item) => ({
      value: item.copyValue || item.title || item.href.replace(/^tel:/i, ""),
      tag: item.kindTag ?? null,
    }))
    .filter((entry) => compactPhone(entry.value));
  if (fromReach.length) return fromReach;
  return collectTaggedPhones(card).filter((entry) => compactPhone(entry.value));
}

function emailsForVCard(
  card: DigitalCardPublicPayload,
  reach: DigitalCardReachItem[]
): Array<{ value: string; tag: ContactKindTag | null }> {
  const fromReach = reach
    .filter((item) => item.brand === "email")
    .map((item) => ({
      value: (item.copyValue || item.title || item.href.replace(/^mailto:/i, "")).trim(),
      tag: item.kindTag ?? null,
    }))
    .filter((entry) => entry.value.includes("@"));
  if (fromReach.length) return fromReach;
  return collectTaggedEmails(card).filter((entry) => entry.value.includes("@"));
}

function websitesForVCard(card: DigitalCardPublicPayload, reach: DigitalCardReachItem[]): string[] {
  const fromReach = reach.map((item) => (item.brand === "website" ? httpHref(item.href) : "")).filter(Boolean);
  if (fromReach.length) return fromReach;
  return collectCardWebsites(card).map(websiteHref).filter((href) => /^https?:\/\//i.test(href));
}

function pushSocial(
  lines: string[],
  item: number,
  type: string,
  label: string,
  user: string,
  href: string
): number {
  const value = httpHref(href) || user;
  if (!value) return item;
  const params = [`TYPE=${type}`];
  if (user) params.push(`x-user=${escapeVCard(user)}`);
  lines.push(`item${item}.X-SOCIALPROFILE;${params.join(";")}:${escapeVCard(value)}`);
  lines.push(`item${item}.X-ABLabel:${escapeVCard(label)}`);
  return item + 1;
}

function pushIm(lines: string[], item: number, service: string, value: string): number {
  const handle = value.trim();
  if (!handle) return item;
  lines.push(`item${item}.IMPP;X-SERVICE-TYPE=${escapeVCard(service)}:${escapeVCard(handle)}`);
  lines.push(`item${item}.X-ABLabel:${escapeVCard(service)}`);
  return item + 1;
}

function pushLabeledUrl(
  lines: string[],
  item: number,
  seen: Set<string>,
  href: string,
  label: string
): number {
  if (seen.has(href)) return item;
  seen.add(href);
  lines.push(`item${item}.URL:${escapeVCard(href)}`);
  lines.push(`item${item}.X-ABLabel:${escapeVCard(label)}`);
  return item + 1;
}

function pushAddress(lines: string[], item: number, row: DigitalCardReachItem): number {
  const place = parseCeleCardPlace(row.copyValue || row.href);
  if (place?.lat != null && place.lng != null) {
    lines.push(`GEO:${place.lat};${place.lng}`);
  }
  const street = (place?.label && !/^-?\d/.test(place.label) ? place.label : "").trim();
  if (street) {
    lines.push(`ADR;CHARSET=UTF-8;TYPE=WORK:;;${escapeVCard(street)};;;;`);
  }
  const mapHref = httpHref(place?.href || row.href);
  if (mapHref) {
    lines.push(`item${item}.URL:${escapeVCard(mapHref)}`);
    lines.push(`item${item}.X-ABLabel:Location`);
    return item + 1;
  }
  return item;
}

function payNoteLine(row: DigitalCardReachItem): string | null {
  if (row.brand === "bank") {
    const bank = parseBankAccount(row.copyValue || "");
    const bits = [bank.bankName, bank.accountName, bank.accountNumber, bank.accountType, bank.notes].filter(Boolean);
    return bits.length ? `Bank: ${bits.join(" · ")}` : null;
  }
  const value = (row.copyValue || row.subtitle || row.title || "").trim();
  if (!value && !row.qrUrl) return null;
  const label = brandReachLabel(row.brand);
  if (row.qrUrl && !value) return `${label}: scan on the CeleYou card`;
  return `${label}: ${value}`;
}

function profileHandle(row: DigitalCardReachItem): string {
  const copied = (row.copyValue || "").trim();
  if (copied && !/^https?:/i.test(copied) && !copied.includes("://")) {
    const last = copied.split("/").filter(Boolean).pop() || copied;
    return last.replace(/^@/, "").replace(/^\$/, "").trim();
  }
  const href = httpHref(row.href);
  if (!href) return (row.subtitle || "").replace(/^@/, "").trim();
  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    if (row.brand === "linkedin") {
      const inAt = parts.findIndex((part) => part === "in" || part === "company");
      return decodeURIComponent(parts[inAt >= 0 ? inAt + 1 : 0] || "").replace(/^@/, "");
    }
    if (row.brand === "youtube") {
      const named = parts.find((part) => part.startsWith("@")) || parts[0] || "";
      return decodeURIComponent(named).replace(/^@/, "");
    }
    const last = parts[parts.length - 1] || "";
    return decodeURIComponent(last).replace(/^@/, "").replace(/^\$/, "");
  } catch {
    return "";
  }
}

function imHandle(row: DigitalCardReachItem): string {
  const copied = (row.copyValue || "").trim();
  if (copied && !/^https?:/i.test(copied)) {
    const number = digits(copied);
    if (number.length >= 7) return `x-apple:${number}`;
    return copied.replace(/^@/, "");
  }
  const href = httpHref(row.href);
  if (!href) return "";
  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(parts[parts.length - 1] || "").replace(/^@/, "");
    const number = digits(last);
    if (number.length >= 7) return `x-apple:${number}`;
    return last || href;
  } catch {
    return href;
  }
}

function httpHref(value?: string | null): string {
  const t = (value || "").trim();
  if (!/^https?:\/\//i.test(t)) return "";
  return t;
}

function compactPhone(value: string, callingCode?: string | null): string {
  const href = internationalTelHref(value, callingCode);
  return href.replace(/^tel:/i, "");
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function vcardNameParts(displayName: string): { family: string; given: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "", given: "" };
  if (parts.length === 1) return { family: "", given: parts[0]! };
  return { family: parts[parts.length - 1]!, given: parts.slice(0, -1).join(" ") };
}

function vcardEmailType(tag: ContactKindTag | null): string {
  if (tag === "business") return "TYPE=INTERNET;TYPE=WORK";
  if (tag === "personal") return "TYPE=INTERNET;TYPE=HOME";
  return "TYPE=INTERNET";
}

function vcardTelType(tag: ContactKindTag | null, index: number): string {
  if (tag === "business") return index === 0 ? "TYPE=WORK;TYPE=VOICE;TYPE=PREF" : "TYPE=WORK;TYPE=VOICE";
  if (tag === "personal") return index === 0 ? "TYPE=CELL;TYPE=VOICE;TYPE=PREF" : "TYPE=CELL;TYPE=VOICE";
  return index === 0 ? "TYPE=CELL;TYPE=VOICE;TYPE=PREF" : "TYPE=CELL;TYPE=VOICE";
}

function vcardRev(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function foldVCardLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const decoder = new TextDecoder();
  let out = "";
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const budget = first ? 75 : 74;
    let take = Math.min(budget, bytes.length - offset);
    while (take > 1 && offset + take < bytes.length && (bytes[offset + take] & 0xc0) === 0x80) take -= 1;
    out += first ? "" : "\r\n ";
    out += decoder.decode(bytes.slice(offset, offset + take));
    offset += take;
    first = false;
  }
  return out;
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
