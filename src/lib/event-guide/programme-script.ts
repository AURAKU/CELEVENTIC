/**
 * The programme script: one document in, an arranged running order out.
 *
 * Organizers do not fill in a running order field by field. They already have
 * one — in a WhatsApp message, a Word file or the printer's proof — and they
 * think of it as a document. So the editor is a single script box, and this
 * module is the one pipeline that reads that script into the entries a guest
 * sees. The builder's live preview, `POST /api/event-guide` and the tests all
 * run this same code, so what the organizer previews is what gets stored.
 *
 * The promise the editor makes is that **nothing is left out**. Every line of
 * the script ends up somewhere: as an entry, as a heading, or as detail under
 * the entry above it. Lines are never silently dropped for failing to look
 * like a programme.
 *
 * What the reader does beyond splitting on newlines:
 *
 *  - **Markup.** Copying out of Word, Docs or a web page can carry HTML. Tags
 *    are removed (script and style with their contents) before a single line is
 *    read, so nothing executable survives the trip to the draft.
 *  - **Section headings.** `CEREMONY` on its own line is a heading, not an
 *    event at 00:00. It is stored as an entry with `kind: "section"` so the
 *    guest's page can set it as a heading instead of a card.
 *  - **Continuations.** An indented line, a bullet under a timed item, or a
 *    sentence of prose belongs to the item above it. A blank line between two
 *    such lines becomes a paragraph break rather than disappearing.
 *  - **Verse.** A hymn is a title with stanzas under it, and a stanza is not
 *    an item of the running order. A run of ordinary-case lines that break on
 *    a comma or a semicolon is read as detail under the line above it, so
 *    `CAPTAIN OF ISRAEL'S HOST` keeps its six lines instead of scattering
 *    them down the page as six bulleted headings.
 *  - **Every script an organizer actually writes in.** Ghanaian orthography,
 *    Arabic, Chinese, emoji and Word's curly punctuation all pass through as
 *    written. Only markup and invisible control characters are removed.
 *
 * **And the organizer always has the last word.** Guessing is only ever the
 * fallback; two marks at the head of a line settle it outright, and they
 * survive save, publish and the round trip back into the editor:
 *
 *     # CEREMONY                 → a heading, whatever it looks like
 *     > Captain of Israel's host → detail under the line above, never a heading
 *
 * They are Markdown's own marks, because that is what an organizer who has
 * ever written a README already expects, and `##`–`######` are read as `#`
 * rather than as a mistake. An indent does what `>` does, for organizers who
 * never read the hint.
 *
 * Pure module: no `next/*`, no Prisma, so the client component, the route and
 * the tests all run the same code.
 */

import { parseProgrammeOutline } from "@/lib/admission/companion-studio";
import { MAX_PROGRAMME_SCRIPT_CHARS, normalizeProgrammeItems } from "./content";
import { HYMN_CUE, isPersonLine, isShouted, VERSE_BREAK, words } from "./programme-lines";
import type { GuideProgrammeItem, GuideProgrammeItemKind } from "./types";

/** Matches the cap in `normalizeProgrammeItems`. */
const MAX_ENTRIES = 150;
const MAX_PASTE_CHARS = MAX_PROGRAMME_SCRIPT_CHARS;
const MAX_HEADING_CHARS = 60;
/** Past this, a title is a sentence; the tail becomes detail rather than being cut. */
const LONG_TITLE_CHARS = 200;
/** Past this, a line is a paragraph someone typed, whatever it ends with. */
const PROSE_LINE_CHARS = 96;
/** Below this, a line is too short to be a line of verse. */
const MIN_VERSE_WORDS = 4;

export interface ProgrammeScriptResult {
  /** The arranged programme, ready to store and to render. */
  items: GuideProgrammeItem[];
  sectionCount: number;
  /** The script held more than the guide will carry and was cut to the cap. */
  truncated: boolean;
  /** Markup was found and removed on the way in. */
  strippedMarkup: boolean;
  /** A title or detail ran past what the guide stores and was shortened. */
  shortened: boolean;
}

const EMPTY_RESULT: ProgrammeScriptResult = {
  items: [],
  sectionCount: 0,
  truncated: false,
  strippedMarkup: false,
  shortened: false,
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
  bull: "•",
  middot: "·",
  deg: "°",
  times: "×",
  euro: "€",
  pound: "£",
  cent: "¢",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  auml: "ä",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  iacute: "í",
  ntilde: "ñ",
  oacute: "ó",
  ocirc: "ô",
  ouml: "ö",
  uacute: "ú",
  uuml: "ü",
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

/**
 * A tag, and only a tag.
 *
 * The old pattern was `<[^>]*>`, which also ate honest text: `Session A <-> B`
 * or `Doors open < 6pm` lost a chunk of the line. Requiring a letter or a
 * closing slash after `<` keeps arithmetic and arrows while still catching
 * everything a browser would parse as an element.
 */
const ANY_TAG = /<\/?[a-zA-Z][^>]*>|<!--[\s\S]*?(?:-->|$)|<![^>]*>|<\?xml[\s\S]*?(?:\?>|$)/gi;
const BLOCK_TAG = /<\s*\/?\s*(?:br|p|div|li|tr|ul|ol|table|h[1-6]|section|article)\b[^>]*>/gi;
const SCRIPT_BLOCK = /<\s*(script|style)\b[\s\S]*?(?:<\s*\/\s*\1\s*>|$)/gi;

/** Drop tags, keeping the block structure they implied as line breaks. */
function removeTags(value: string): string {
  return value.replace(SCRIPT_BLOCK, " ").replace(BLOCK_TAG, "\n").replace(ANY_TAG, "");
}

function hasMarkup(value: string): boolean {
  ANY_TAG.lastIndex = 0;
  return ANY_TAG.test(value);
}

/**
 * Every line break a real paste arrives with.
 *
 * Word and Excel use a lone `\r` between cells and `\v` for a soft break
 * inside one; Docs and some PDF viewers emit U+2028/U+2029. Folding them all
 * to `\n` first is what keeps a pasted running order from collapsing into a
 * single unreadable line.
 */
const LINE_BREAKS = /\r\n?|[\u000B\u000C\u0085\u2028\u2029]/g;

/**
 * Spaces that are not the space bar: Word's non-breaking space, the thin and
 * en spaces a designer's document carries, CJK's ideographic space. They are
 * folded to a plain space so the time parser and the indentation rule see
 * what the organizer sees.
 */
const EXOTIC_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

/**
 * Characters that carry no meaning on a printed programme and can only cause
 * trouble: C0/C1 controls, the zero-width space and BOM a copied document
 * sneaks in, the soft hyphen Word uses for justification, and the bidi
 * overrides that can make a title render backwards.
 *
 * Deliberately absent: U+200C/U+200D (zero-width non-joiner and joiner). They
 * are letters' worth of meaning in Persian, Arabic and Indic scripts, and they
 * are what holds a family emoji together — stripping them, as this module once
 * did, silently rewrote people's words.
 */
const INVISIBLES =
  /[\u0000-\u0008\u000E-\u001F\u007F-\u009F\u00AD\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Never let the paste cap cut a surrogate pair in half. */
function sliceToCap(raw: string): string {
  const source = raw.slice(0, MAX_PASTE_CHARS);
  const last = source.charCodeAt(source.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? source.slice(0, -1) : source;
}

/**
 * Strip markup and invisible characters, keeping every printable code point.
 *
 * Ghanaian orthography (Ɛ ɛ Ɔ ɔ Ŋ ŋ and the tone marks that come with it),
 * Arabic, Chinese, emoji, curly quotes and em dashes from Word — all of it
 * passes through as written. What leaves is tags, comments and characters a
 * guest could never see anyway.
 */
export function sanitizeProgrammeScript(raw: string): { text: string; stripped: boolean } {
  const source = sliceToCap(raw).replace(LINE_BREAKS, "\n");
  const hadMarkup = hasMarkup(source);

  // Entities are decoded between two tag passes so an escaped `&lt;script&gt;`
  // cannot smuggle a tag past the first one.
  let text = decodeEntities(removeTags(source));
  if (text.includes("<")) text = removeTags(text);

  INVISIBLES.lastIndex = 0;
  const hadInvisibles = INVISIBLES.test(text);
  INVISIBLES.lastIndex = 0;
  text = text.replace(INVISIBLES, "").replace(EXOTIC_SPACES, " ");

  // Composed form so `Ɛ` typed as a letter and `Ɛ` typed as letter + combining
  // mark compare, sort and truncate as the same word.
  if (typeof text.normalize === "function") text = text.normalize("NFC");

  return { text, stripped: hadMarkup || hadInvisibles };
}

/**
 * WhatsApp and Markdown emphasis around a whole phrase.
 *
 * `*CEREMONY*` pasted out of a WhatsApp broadcast should read as CEREMONY, not
 * as a title wearing asterisks. Single `_` is left alone: it turns up inside
 * real words far more often than it wraps them.
 */
const EMPHASIS = /(\*\*|\*|__|~~|~)(?=\S)([\s\S]*?\S)\1/g;
const BULLET = /^[-–—•*·‣▪◦]+\s*/;

/**
 * The two marks an organizer can put at the head of a line to overrule the
 * reader: `#` makes it a heading, `>` makes it detail under the line above.
 *
 * Markdown's own marks, so an organizer who has written a README already
 * knows them, and `##`–`######` mean the same as `#` rather than being a
 * mistake. Two marks and no more: a hint that fits on one line is a hint
 * organizers read.
 */
export type ProgrammeLineMark = "header" | "subscript" | null;

const HASH_MARK = /^#{1,6}[ \t]+/;
const QUOTE_MARK = /^>+[ \t]*/;

function readMark(body: string): { mark: ProgrammeLineMark; rest: string } {
  const hashes = HASH_MARK.exec(body);
  if (hashes) return { mark: "header", rest: body.slice(hashes[0].length) };

  const quote = QUOTE_MARK.exec(body);
  if (quote) return { mark: "subscript", rest: body.slice(quote[0].length) };

  return { mark: null, rest: body };
}

/**
 * Decoration that runs ahead of the text: emoji bullets, dingbats, the arrow a
 * printer's proof uses. Stripped only when a time follows it, so an emoji that
 * belongs to the title (`🎂 Cutting of the cake`) stays where it was put.
 */
const LEADING_DECORATION = /^[\p{Extended_Pictographic}\p{So}\uFE0E\uFE0F\u200D\s]+/u;
const STARTS_WITH_TIME = /^\d{1,2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s?m\.?|[:.]|\s)/i;

function cleanLine(body: string): string {
  // Emphasis first: a WhatsApp `*CEREMONY*` would otherwise lose its opening
  // asterisk to the bullet rule and keep the closing one for ever.
  const withoutBullet = body.replace(EMPHASIS, "$2").trim().replace(BULLET, "");
  const undecorated = withoutBullet.replace(LEADING_DECORATION, "");
  return (STARTS_WITH_TIME.test(undecorated) ? undecorated : withoutBullet).trim();
}

interface ScriptBlock {
  head: string;
  continuation: string[];
  /** The organizer wrote `#` on the head line. */
  forced: boolean;
  /** A `>` line with nothing above it: a subscript that stands alone. */
  standalone: boolean;
}

/**
 * Sentence-ending punctuation in the scripts this is written in.
 *
 * Trailing sparkles and quotation marks are allowed after the stop, because
 * an organizer signing off writes `THANK YOU FOR YOUR PRAYERS. ✨` and means
 * a sentence, not a heading.
 */
const TRAILING_DECORATION = "[\\s\\p{Extended_Pictographic}\\p{So}\\uFE0E\\uFE0F\")'”’]*";
const SENTENCE_END = new RegExp(`[.!?…。！？؟۔]${TRAILING_DECORATION}$`, "u");
const BULLET_LINE = /^[-–—•*·‣▪◦]\s+\S/;

/**
 * A line that reads as a sentence about the item above it rather than as an
 * item of its own: it opens in lower case, it closes with a full stop, or it
 * simply runs on past the length of any title.
 *
 * `Cutting of the cake` is an item. `Guests are asked to stay seated.` is a
 * note about the item above it. Getting this right is what lets an organizer
 * type a programme the way they would write it out, instead of learning an
 * indentation rule first.
 */
function looksLikeProse(value: string): boolean {
  if (!value || value.endsWith(":")) return false;
  if (STARTS_WITH_TIME.test(value)) return false;

  const firstLetter = value.match(/\p{L}/u)?.[0];
  if (
    firstLetter &&
    firstLetter === firstLetter.toLocaleLowerCase() &&
    firstLetter !== firstLetter.toLocaleUpperCase()
  ) {
    return true;
  }
  if (value.length > PROSE_LINE_CHARS && !isShouted(value)) return true;
  return SENTENCE_END.test(value);
}

interface ScriptLine {
  body: string;
  cleaned: string;
  mark: ProgrammeLineMark;
  indented: boolean;
  blankBefore: boolean;
}

/**
 * Could this line be a line of verse — and nothing more important?
 *
 * Deliberately narrow. Anything the rest of the reader has a claim on is out:
 * a heading in capitals, a person, a time, a label ending in a colon, a line
 * the organizer already marked, a line too short to be poetry. What is left
 * is an ordinary-case phrase of four words or more, which is what a stanza
 * looks like and what almost nothing else on a programme does.
 */
function couldBeVerse(line: ScriptLine): boolean {
  if (line.mark || line.indented) return false;
  const value = line.cleaned;
  if (!value || value.endsWith(":")) return false;
  if (STARTS_WITH_TIME.test(value)) return false;
  if (isShouted(value) || isPersonLine(value)) return false;
  return words(value).length >= MIN_VERSE_WORDS;
}

/**
 * Is this run of candidate lines announced as something to be sung?
 *
 * A hymn is written as three lines, not one: `OPENING HYMN`, then the hymn's
 * own title, then the stanza. So the two lines above the run are both asked,
 * which is what makes the stanza under `OPENING HYMN / CAPTAIN OF ISRAEL'S
 * HOST` verse even when the organizer punctuated none of it.
 */
function announcedAsVerse(lines: ScriptLine[], start: number): boolean {
  for (let at = start - 1; at >= 0 && at >= start - 2; at -= 1) {
    if (HYMN_CUE.test(lines[at]!.cleaned)) return true;
  }
  return false;
}

/**
 * Which lines belong to a stanza rather than to the running order.
 *
 * A run of candidate lines is verse when one of them breaks on a comma or a
 * semicolon — one line of a hymn vouches for its neighbours, which is what
 * catches the opening line `Captain of Israel's host, and Guide` that ends on
 * no punctuation at all — or when the run is two lines or more under a line
 * that announced a hymn. Blank lines between stanzas do not break the run,
 * because they are kept as the paragraph breaks they are.
 */
function findVerse(lines: ScriptLine[]): boolean[] {
  const candidate = lines.map(couldBeVerse);
  const verse = lines.map(() => false);

  for (let start = 0; start < lines.length; ) {
    if (!candidate[start]) {
      start += 1;
      continue;
    }
    let end = start;
    while (end < lines.length && candidate[end]) end += 1;

    const run = lines.slice(start, end);
    const sung =
      run.some((line) => VERSE_BREAK.test(line.cleaned)) ||
      (run.length >= 2 && announcedAsVerse(lines, start));

    if (sung) for (let at = start; at < end; at += 1) verse[at] = true;
    start = end;
  }

  return verse;
}

/** Split the script into the lines that carry something, marks read off. */
function toLines(text: string): ScriptLine[] {
  const lines: ScriptLine[] = [];
  let blankBefore = false;

  for (const rawLine of text.split("\n")) {
    const body = rawLine.trim();
    if (!body) {
      blankBefore = true;
      continue;
    }

    const { mark, rest } = readMark(body);
    const cleaned = cleanLine(rest);
    // A rule of dashes or a row of stars is decoration, not a line of the
    // programme; it is the only thing the reader ever drops.
    if (!cleaned) continue;

    lines.push({
      body,
      cleaned,
      mark,
      indented: /^(?:\t| {2,})\S/.test(rawLine),
      blankBefore,
    });
    blankBefore = false;
  }

  return lines;
}

/**
 * Group the script's lines into a head line plus the lines that continue it.
 *
 * A line continues the one above it when the organizer marked it `>`, when it
 * is indented, when it is a bullet under a timed item, when it reads as
 * prose, or when it is a line of a stanza. Everything else starts a new entry
 * — and nothing is discarded, so the whole script is accounted for. A blank
 * line inside a run of continuations is kept as a paragraph break.
 */
function toBlocks(text: string): ScriptBlock[] {
  const lines = toLines(text);
  const verse = findVerse(lines);
  const blocks: ScriptBlock[] = [];

  lines.forEach((line, index) => {
    const previous = blocks[blocks.length - 1];
    const continues =
      previous !== undefined &&
      line.mark !== "header" &&
      (line.mark === "subscript" ||
        line.indented ||
        verse[index] ||
        (BULLET_LINE.test(line.body) && STARTS_WITH_TIME.test(previous.head)) ||
        looksLikeProse(line.cleaned));

    if (continues && previous) {
      if (line.blankBefore && previous.continuation.length > 0) previous.continuation.push("");
      previous.continuation.push(line.cleaned);
      return;
    }

    blocks.push({
      head: line.cleaned,
      continuation: [],
      forced: line.mark === "header",
      standalone: line.mark === "subscript",
    });
  });

  return blocks;
}

/**
 * A time-less, punctuation-free line that reads as a heading rather than an
 * item.
 *
 * Carrying detail disqualifies a line outright, and that single condition is
 * what keeps a hymn where it belongs: `CAPTAIN OF ISRAEL'S HOST` is in
 * capitals and has no clock, but it has six lines of verse under it, so it is
 * the item those lines belong to rather than a signpost between two of them.
 */
function looksLikeSection(title: string, time: string, description: string | undefined): boolean {
  if (time || description) return false;
  const value = title.trim();
  if (!value || value.length > MAX_HEADING_CHARS) return false;
  if (new RegExp(`[.!?,]${TRAILING_DECORATION}$`, "u").test(value)) return false;
  if (value.endsWith(":")) return true;

  const letters = value.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return false;
  return letters === letters.toLocaleUpperCase() && letters !== letters.toLocaleLowerCase();
}

/**
 * What this block is, with the organizer's mark taking precedence over the
 * reader's guess.
 *
 * A heading the organizer marked with `#` keeps its heading even though it
 * carries detail; a heading the reader merely recognised never does, which is
 * what keeps a hymn title with six stanzas under it an item rather than a
 * signpost.
 */
function itemKind(
  block: ScriptBlock,
  title: string,
  time: string,
  description: string | undefined
): GuideProgrammeItemKind | undefined {
  if (block.forced) return "section";
  if (block.standalone) return "note";
  return looksLikeSection(title, time, description) ? "section" : undefined;
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
 * Read a programme script into the arranged running order.
 *
 * Nothing here writes or publishes. The result is what the organizer is shown
 * in the live preview and, if they save, what is stored beside their script.
 */
export function parseProgrammeScript(raw: string): ProgrammeScriptResult {
  if (typeof raw !== "string" || !raw.trim()) return EMPTY_RESULT;

  const { text, stripped } = sanitizeProgrammeScript(raw);
  const blocks = toBlocks(text);
  if (blocks.length === 0) return { ...EMPTY_RESULT, strippedMarkup: stripped };

  const drafts: GuideProgrammeItem[] = [];
  const usedIds = new Set<string>();

  for (const block of blocks.slice(0, MAX_ENTRIES)) {
    const [parsed] = parseProgrammeOutline(block.head);
    if (!parsed?.title?.trim()) continue;

    const time = parsed.time?.trim() ?? "";
    const { title, overflow } = splitOverlongTitle(parsed.title.trim());
    const description = joinDetail([parsed.description, overflow], block.continuation);
    const kind = itemKind(block, title, time, description);

    drafts.push({
      id: uniqueId(`prog-${drafts.length + 1}-${slugFragment(title)}`, usedIds),
      time,
      title: kind === "section" ? title.replace(/:$/, "").trim() : title,
      ...(description ? { description } : {}),
      ...(kind ? { kind } : {}),
    });
  }

  const items = normalizeProgrammeItems(drafts);
  const shortened = drafts.some((draft, index) => {
    const stored = items[index];
    if (!stored) return false;
    return (
      stored.title.length < draft.title.length ||
      (draft.description ?? "").length > (stored.description ?? "").length
    );
  });

  return {
    items,
    sectionCount: items.filter((item) => item.kind === "section").length,
    truncated: blocks.length > MAX_ENTRIES,
    strippedMarkup: stripped,
    shortened,
  };
}

/**
 * Write entries back out as a script.
 *
 * This is how an organizer takes over a programme they inherited from their
 * invitation, and how a guide saved before the script editor existed opens
 * with its running order already in the box. Re-reading the result gives the
 * same entries back.
 */
export function programmeItemsToScript(items: GuideProgrammeItem[]): string {
  const lines: string[] = [];

  for (const item of items) {
    const title = item.title.trim();
    if (!title) continue;
    const detail = item.description?.trim();

    if (item.kind === "note") {
      // A subscript with no item above it can only survive the round trip as
      // the mark that says so.
      lines.push(`> ${title}`);
    } else if (item.kind === "section") {
      // A heading that carries detail cannot be recognised by its shape alone,
      // so it is written in the form that always reads as a heading.
      lines.push(detail ? `# ${title}` : headingLine(title));
    } else {
      const time = item.time?.trim();
      lines.push(time ? `${time} — ${title}` : title);
    }

    if (detail) {
      for (const line of detail.split("\n")) {
        lines.push(line.trim() ? `  ${line.trim()}` : "");
      }
    }
  }

  return lines.join("\n");
}

/** Already shouting or not, a heading has to come back as one. */
function headingLine(title: string): string {
  const value = title.replace(/:$/, "").trim();
  const letters = value.replace(/[^\p{L}]/gu, "");
  const shouted =
    letters.length >= 2 &&
    letters === letters.toLocaleUpperCase() &&
    letters !== letters.toLocaleLowerCase();
  return shouted && value.length <= MAX_HEADING_CHARS ? value : `${value}:`;
}

/**
 * A line long enough to be a sentence is a title plus a detail, not a title.
 *
 * Cutting it at the cap would lose the end of it, and the editor promises that
 * nothing pasted is lost, so the tail moves into the detail instead.
 */
function splitOverlongTitle(value: string): { title: string; overflow?: string } {
  if (value.length <= LONG_TITLE_CHARS) return { title: value };

  const window = value.slice(0, LONG_TITLE_CHARS);
  const sentence = window.lastIndexOf(". ");
  const space = window.lastIndexOf(" ");
  const at = sentence > 40 ? sentence + 1 : space > 40 ? space : LONG_TITLE_CHARS;

  return { title: value.slice(0, at).trim(), overflow: value.slice(at).trim() };
}

/**
 * Fold a head line's detail and its continuation lines into one string.
 *
 * Newlines survive: a detail written as two paragraphs is stored as two
 * paragraphs and rendered as two paragraphs, in the preview, in the editor and
 * on the guest's page. Joining with a space — what this used to do — turned a
 * reading, a soloist and a note about seating into one run-on sentence.
 */
function joinDetail(
  leads: Array<string | undefined>,
  continuation: string[]
): string | undefined {
  const parts: string[] = [];
  for (const lead of leads) {
    const value = lead?.trim();
    if (value) parts.push(value);
  }
  parts.push(...continuation);

  return (
    parts
      .join("\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+|\n+$/g, "")
      .trim() || undefined
  );
}

function uniqueId(candidate: string, used: Set<string>): string {
  let id = candidate;
  let suffix = 2;
  while (used.has(id)) id = `${candidate}-${suffix++}`;
  used.add(id);
  return id;
}
