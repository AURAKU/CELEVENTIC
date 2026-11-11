import type { DigitalCardPublicPayload } from "./types";
import { DIGITAL_CARD_PUBLIC_PATH } from "./types";
import {
  brandReachLabel,
  collectCardWebsites,
  collectTaggedEmails,
  collectTaggedPhones,
  isLiveReachItem,
  listDigitalCardReachItems,
  type ContactKindTag,
} from "./socials";
import { parseCeleCardPlace } from "./maps";
import { isCeleCardPhotoUrl } from "./portraits";

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
  whatsapp: "whatsapp",
  telegram: "telegram",
  signal: "signal",
  wechat: "wechat",
};

export function buildVCard(card: DigitalCardPublicPayload, options: BuildVCardOptions = {}): string {
  const { family, given } = vcardNameParts(card.displayName);
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "PRODID:-//Celeventic//CeleYou//EN",
    `UID:celecard:${escapeVCard(card.id || card.slug)}`,
    `FN:${escapeVCard(card.displayName)}`,
    `N:${escapeVCard(family)};${escapeVCard(given)};;;`,
  ];
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`);
  if (card.title) lines.push(`TITLE:${escapeVCard(card.title)}`);
  lines.push("CATEGORIES:CeleYou");

  collectTaggedPhones(card).forEach((entry, index) => {
    lines.push(`TEL;TYPE=${vcardTelType(entry.tag, index)}:${escapeVCard(entry.value)}`);
  });
  collectTaggedEmails(card).forEach((entry) => {
    const type = vcardEmailType(entry.tag);
    lines.push(
      type
        ? `EMAIL;TYPE=INTERNET,${type}:${escapeVCard(entry.value)}`
        : `EMAIL;TYPE=INTERNET:${escapeVCard(entry.value)}`
    );
  });
  collectCardWebsites(card).forEach((site, index) => {
    const href = websiteHref(site);
    if (!href) return;
    lines.push(index === 0 ? `URL;TYPE=WORK:${escapeVCard(href)}` : `URL:${escapeVCard(href)}`);
  });

  let item = 1;
  const seenUrls = new Set<string>();
  const cardUrl = options.cardUrl?.trim() || "";
  if (cardUrl) {
    seenUrls.add(cardUrl);
    lines.push(`URL;TYPE=PREF:${escapeVCard(cardUrl)}`);
    lines.push(`item${item}.URL:${escapeVCard(cardUrl)}`);
    lines.push(`item${item}.X-ABLabel:CeleYou`);
    item += 1;
  }

  const notes: string[] = [];
  if (card.pronouns) notes.push(card.pronouns);
  if (card.bio) notes.push(card.bio);

  for (const reach of unlockedReach(card)) {
    if (reach.brand === "email" || reach.brand === "phone" || reach.brand === "website") continue;
    if (reach.brand === "meeting") {
      const meeting = [reach.title, reach.subtitle].filter(Boolean).join(" · ");
      if (meeting) notes.push(meeting);
      continue;
    }
    if (reach.brand === "bank") {
      const bank = [reach.title, reach.subtitle, reach.copyValue].filter(Boolean).join(" · ");
      if (bank) notes.push(bank);
      continue;
    }
    if (reach.brand === "location") {
      const place = parseCeleCardPlace(reach.copyValue || reach.href);
      if (place?.lat != null && place.lng != null) {
        lines.push(`GEO:${place.lat};${place.lng}`);
      }
      if (place?.label && !/^-?\d/.test(place.label)) {
        lines.push(`ADR;TYPE=WORK:;;${escapeVCard(place.label)};;;;`);
      }
      const mapHref = (place?.href || reach.href || "").trim();
      if (/^https?:\/\//i.test(mapHref)) {
        item = pushReachUrl(lines, item, seenUrls, mapHref, "Location", null);
      }
      continue;
    }
    const href = (reach.href || "").trim();
    if (!/^https?:\/\//i.test(href)) {
      if (reach.copyValue) notes.push(`${brandReachLabel(reach.brand)} · ${reach.copyValue}`);
      continue;
    }
    const label = reach.brand === "other" ? reach.title || "Page" : brandReachLabel(reach.brand);
    item = pushReachUrl(lines, item, seenUrls, href, label, SOCIAL_PROFILE_TYPE[reach.brand] ?? null);
  }

  if (options.photo?.base64 && isCeleCardPhotoUrl(card.avatarUrl)) {
    const type = options.photo.type === "PNG" ? "PNG" : "JPEG";
    lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${options.photo.base64.replace(/\s+/g, "")}`);
  }

  if (notes.length) lines.push(`NOTE:${escapeVCard(notes.join("\n"))}`);
  lines.push(`REV:${vcardRev()}`);
  lines.push("END:VCARD");
  return lines.map(foldVCardLine).join("\r\n") + "\r\n";
}

function pushReachUrl(
  lines: string[],
  item: number,
  seen: Set<string>,
  href: string,
  label: string,
  socialType: string | null
): number {
  if (seen.has(href)) return item;
  seen.add(href);
  lines.push(`URL:${escapeVCard(href)}`);
  if (socialType) {
    lines.push(`X-SOCIALPROFILE;TYPE=${socialType}:${escapeVCard(href)}`);
  }
  lines.push(`item${item}.URL:${escapeVCard(href)}`);
  lines.push(`item${item}.X-ABLabel:${escapeVCard(label)}`);
  return item + 1;
}

function unlockedReach(card: DigitalCardPublicPayload) {
  const items = Array.isArray(card.guestReach) ? card.guestReach : listDigitalCardReachItems(card);
  return items.filter((item) => !item.locked && isLiveReachItem(item));
}

function vcardNameParts(displayName: string): { family: string; given: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "", given: "" };
  if (parts.length === 1) return { family: "", given: parts[0]! };
  return { family: parts[parts.length - 1]!, given: parts.slice(0, -1).join(" ") };
}

function vcardEmailType(tag: ContactKindTag | null): "WORK" | "HOME" | null {
  if (tag === "business") return "WORK";
  if (tag === "personal") return "HOME";
  return null;
}

function vcardTelType(tag: ContactKindTag | null, index: number): string {
  if (tag === "business") return "WORK,VOICE";
  if (tag === "personal") return "CELL,VOICE";
  return index === 0 ? "CELL,VOICE" : "VOICE";
}

function websiteHref(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/\//, "")}`;
}

function vcardRev(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function foldVCardLine(line: string): string {
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let rest = line.slice(75);
  while (rest.length) {
    out += `\r\n ${rest.slice(0, 74)}`;
    rest = rest.slice(74);
  }
  return out;
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
