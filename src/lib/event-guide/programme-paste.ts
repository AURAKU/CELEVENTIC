/**
 * Turning a pasted programme into draft entries.
 *
 * Organizers almost never type a running order into a form — they already have
 * one, in a WhatsApp message, a Word file or the printer's proof. This module
 * is the single pipeline that turns that paste into guide entries, shared by
 * the builder's live preview and by `POST /api/event-guide` so the organizer
 * sees exactly what the server will store.
 *
 * Three things the raw parser does not do, which a paste box needs:
 *
 *  - **Markup.** Copying out of Word, Docs or a web page can carry HTML. Tags
 *    are removed (script and style with their contents) before a single line is
 *    read, so nothing executable survives the trip to the draft.
 *  - **Section headings.** `CEREMONY` on its own line is a heading, not an
 *    event at 00:00. It stays a normal entry — the stored shape is unchanged —
 *    but the preview can show the organizer that we read it as a heading.
 *  - **Continuations.** An indented line belongs to the item above it, which is
 *    how multi-line descriptions survive the paste.
 *
 * Pure module: no `next/*`, no Prisma, so the client component, the route and
 * the tests all run the same code.
 */

import { parseProgrammeOutline } from "@/lib/admission/companion-studio";
import { normalizeProgrammeItems } from "./content";
import type { GuideProgrammeItem } from "./types";

/** Matches the cap in `normalizeProgrammeItems`. */
const MAX_ENTRIES = 60;
const MAX_PASTE_CHARS = 20_000;
const MAX_HEADING_CHARS = 60;

export interface ProgrammePasteEntry extends GuideProgrammeItem {
  /** A time-less heading line such as `CEREMONY` or `Reception:`. */
  isSection: boolean;
}

export interface ProgrammePasteResult {
  entries: ProgrammePasteEntry[];
  sectionCount: number;
  /** The paste held more than the guide will carry and was cut to the cap. */
  truncated: boolean;
  /** Markup was found and removed on the way in. */
  strippedMarkup: boolean;
}

const EMPTY_RESULT: ProgrammePasteResult = {
  entries: [],
  sectionCount: 0,
  truncated: false,
  strippedMarkup: false,
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/&#(\d{1,7});/g, (match, code: string) => {
      const point = Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (match, code: string) => {
      const point = Number.parseInt(code, 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    });
}

/** Drop tags, keeping the block structure they implied as line breaks. */
function removeTags(value: string): string {
  return value
    .replace(/<\s*(script|style)\b[\s\S]*?(?:<\s*\/\s*\1\s*>|$)/gi, " ")
    .replace(/<\s*\/?\s*(?:br|p|div|li|tr|ul|ol|table|h[1-6]|section|article)\b[^>]*>/gi, "\n")
    .replace(/<!--[\s\S]*?(?:-->|$)/g, " ")
    .replace(/<[^>]*>/g, "");
}

/**
 * Strip markup and control characters, keeping every printable code point.
 *
 * Ghanaian orthography (Ɛ ɛ Ɔ ɔ Ŋ ŋ, and the tonal marks that come with it)
 * and any other script pass through untouched — only tags, comments, C0/C1
 * controls and zero-width characters are removed.
 */
export function stripPasteMarkup(raw: string): { text: string; stripped: boolean } {
  const source = raw.slice(0, MAX_PASTE_CHARS);
  const hadMarkup = /<[^>]*>|&(?:[a-z]+|#x?[0-9a-f]+);/i.test(source);

  // Entities are decoded between two tag passes so an escaped `&lt;script&gt;`
  // cannot smuggle a tag past the first one.
  let text = decodeEntities(removeTags(source));
  if (text.includes("<")) text = removeTags(text);

  const controls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g;
  const hadControls = controls.test(text);
  controls.lastIndex = 0;
  text = text.replace(controls, "");

  return { text, stripped: hadMarkup || hadControls };
}

/**
 * Group lines into a head line plus the indented lines that continue it.
 *
 * Indentation is the only signal used. A programme where every line sits at
 * the left margin therefore behaves exactly as it did before continuations
 * existed: one line, one entry.
 */
function toBlocks(text: string): { head: string; continuation: string[] }[] {
  const blocks: { head: string; continuation: string[] }[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const body = rawLine.trim();
    if (!body) continue;

    const indented = /^(?:\t| {2,})\S/.test(rawLine);
    const previous = blocks[blocks.length - 1];
    if (indented && previous) {
      previous.continuation.push(body.replace(/^[-–—•*]\s*/, "").trim());
      continue;
    }

    blocks.push({ head: rawLine, continuation: [] });
  }

  return blocks;
}

/** A time-less, punctuation-free line that reads as a heading rather than an item. */
function looksLikeSection(title: string, time: string, description: string | undefined): boolean {
  if (time || description) return false;
  const value = title.trim();
  if (!value || value.length > MAX_HEADING_CHARS) return false;
  if (/[.!?,]$/.test(value)) return false;
  if (value.endsWith(":")) return true;

  const letters = value.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return false;
  return letters === letters.toLocaleUpperCase() && letters !== letters.toLocaleLowerCase();
}

function slugFragment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "item"
  );
}

/**
 * Read a pasted programme into draft entries.
 *
 * Nothing here writes or publishes. The result is a proposal an organizer can
 * look at and reject.
 */
export function parseProgrammePaste(raw: string): ProgrammePasteResult {
  if (typeof raw !== "string" || !raw.trim()) return EMPTY_RESULT;

  const { text, stripped } = stripPasteMarkup(raw);
  const blocks = toBlocks(text);
  if (blocks.length === 0) return { ...EMPTY_RESULT, strippedMarkup: stripped };

  const sections = new Map<string, boolean>();
  const drafts: GuideProgrammeItem[] = [];
  const usedIds = new Set<string>();

  for (const block of blocks.slice(0, MAX_ENTRIES)) {
    const [parsed] = parseProgrammeOutline(block.head);
    if (!parsed?.title?.trim()) continue;

    const time = parsed.time?.trim() ?? "";
    const title = parsed.title.trim();
    const description =
      [parsed.description?.trim(), ...block.continuation].filter(Boolean).join(" ") || undefined;
    const section = looksLikeSection(title, time, description);

    const id = uniqueId(`prog-${drafts.length + 1}-${slugFragment(title)}`, usedIds);
    sections.set(id, section);
    drafts.push({
      id,
      time,
      title: section ? title.replace(/:$/, "").trim() : title,
      ...(description ? { description } : {}),
    });
  }

  const items = normalizeProgrammeItems(drafts);
  const entries: ProgrammePasteEntry[] = items.map((item) => ({
    ...item,
    isSection: sections.get(item.id) ?? false,
  }));

  return {
    entries,
    sectionCount: entries.filter((entry) => entry.isSection).length,
    truncated: blocks.length > MAX_ENTRIES,
    strippedMarkup: stripped,
  };
}

function uniqueId(candidate: string, used: Set<string>): string {
  let id = candidate;
  let suffix = 2;
  while (used.has(id)) id = `${candidate}-${suffix++}`;
  used.add(id);
  return id;
}

/**
 * Fold parsed entries into the programme the organizer is editing.
 *
 * Appending has to re-key collisions: two pastes of the same running order
 * would otherwise produce duplicate React keys and, worse, duplicate ids in
 * the published payload.
 */
export function mergeProgrammeEntries(
  existing: GuideProgrammeItem[],
  incoming: GuideProgrammeItem[],
  mode: "replace" | "append"
): GuideProgrammeItem[] {
  const base = mode === "append" ? existing : [];
  const used = new Set(base.map((item) => item.id));
  const merged = [...base];

  for (const item of incoming) {
    merged.push({ ...item, id: uniqueId(item.id, used) });
  }

  return merged.slice(0, MAX_ENTRIES);
}

/**
 * Drop the preview-only `isSection` hint.
 *
 * The stored programme shape is unchanged by this feature, so a heading is
 * persisted as an ordinary time-less entry and every existing reader — the
 * public payload, the offline pack, the printed signs — keeps working.
 */
export function toProgrammeItems(entries: ProgrammePasteEntry[]): GuideProgrammeItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    time: entry.time,
    title: entry.title,
    ...(entry.description ? { description: entry.description } : {}),
  }));
}
