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
  const cardUrl = options.cardUrl?.trim() || "";
  if (cardUrl) {
    lines.push(`item${item}.URL:${escapeVCard(cardUrl)}`);
    lines.push(`item${item}.X-ABLabel:CeleYou`);
    item += 1;
  }

  const notes: string[] = [];
  if (card.bio) notes.push(card.bio);

  for (const reach of unlockedReach(card)) {
    if (reach.brand === "email" || reach.brand === "phone" || reach.brand === "website" || reach.brand === "meeting") continue;
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
        lines.push(`item${item}.URL:${escapeVCard(mapHref)}`);
        lines.push(`item${item}.X-ABLabel:Location`);
        item += 1;
      }
      continue;
    }
    const href = (reach.href || "").trim();
    if (!/^https?:\/\//i.test(href)) {
      if (reach.copyValue) notes.push(`${brandReachLabel(reach.brand)} · ${reach.copyValue}`);
      continue;
    }
    lines.push(`item${item}.URL:${escapeVCard(href)}`);
    lines.push(
      `item${item}.X-ABLabel:${escapeVCard(
        reach.brand === "other" ? reach.title || "Page" : brandReachLabel(reach.brand)
      )}`
    );
    item += 1;
  }

  if (options.photo?.base64 && isCeleCardPhotoUrl(card.avatarUrl)) {
    const type = options.photo.type === "PNG" ? "PNG" : "JPEG";
    lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${options.photo.base64.replace(/\s+/g, "")}`);
  }

  if (notes.length) lines.push(`NOTE:${escapeVCard(notes.join("\n"))}`);
  lines.push(`REV:${vcardRev()}`);
  lines.push("END:VCARD");
  return lines.map(foldVCardLine).join("\r\n");
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
