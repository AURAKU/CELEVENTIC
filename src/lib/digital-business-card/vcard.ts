import type { DigitalCardPublicPayload } from "./types";
import {
  collectCardWebsites,
  collectTaggedEmails,
  collectTaggedPhones,
  type ContactKindTag,
} from "./socials";

export function buildVCard(card: DigitalCardPublicPayload): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(card.displayName)}`,
  ];
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`);
  if (card.title) lines.push(`TITLE:${escapeVCard(card.title)}`);
  collectTaggedPhones(card).forEach((entry, index) => {
    lines.push(`TEL;TYPE=${vcardTelType(entry.tag, index)}:${escapeVCard(entry.value)}`);
  });
  collectTaggedEmails(card).forEach((entry) => {
    const type = vcardEmailType(entry.tag);
    lines.push(type ? `EMAIL;TYPE=${type}:${escapeVCard(entry.value)}` : `EMAIL:${escapeVCard(entry.value)}`);
  });
  collectCardWebsites(card).forEach((site) => {
    lines.push(`URL:${escapeVCard(site)}`);
  });
  if (card.bio) lines.push(`NOTE:${escapeVCard(card.bio)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function vcardEmailType(tag: ContactKindTag | null): "WORK" | "HOME" | null {
  if (tag === "business") return "WORK";
  if (tag === "personal") return "HOME";
  return null;
}

function vcardTelType(tag: ContactKindTag | null, index: number): string {
  if (tag === "business") return "WORK";
  if (tag === "personal") return "CELL";
  return index === 0 ? "CELL" : "VOICE";
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
