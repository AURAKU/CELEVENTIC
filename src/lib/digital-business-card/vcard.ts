import type { DigitalCardPublicPayload } from "./types";

export function buildVCard(card: DigitalCardPublicPayload): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(card.displayName)}`,
  ];
  if (card.company) lines.push(`ORG:${escapeVCard(card.company)}`);
  if (card.title) lines.push(`TITLE:${escapeVCard(card.title)}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(card.phone)}`);
  if (card.email) lines.push(`EMAIL:${escapeVCard(card.email)}`);
  if (card.website || card.socials.website) {
    lines.push(`URL:${escapeVCard(card.website || card.socials.website || "")}`);
  }
  if (card.bio) lines.push(`NOTE:${escapeVCard(card.bio)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
