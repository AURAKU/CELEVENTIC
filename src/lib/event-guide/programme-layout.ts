/**
 * Arranging a stored programme into the blocks a guest actually reads.
 *
 * `parseProgrammeScript` answers "what did the organizer write?" — one entry
 * per line, nothing left out. This module answers the different question of
 * "what kind of page is this?", because a real order of service is not a flat
 * list. It opens with a title page, names the people taking part, and only
 * then runs the clock:
 *
 *     WEDDING SOLEMNIZATION      ← a cover, set like an invitation
 *     BETWEEN
 *     MR. KWAME MENSAH
 *     AND
 *     MISS AKOSUA ADJEI
 *     SATURDAY, 12 DECEMBER 2026
 *     FUNCTIONARIES              ← a signpost, once
 *     OFFICIATING MINISTER: REV. K. ANNAN   ← a roster of people
 *     ORGANIST: MR. KOFI BOATENG
 *     10:00 AM - Processional    ← the schedule
 *
 * Every one of those lines is an upper-case, time-less entry, so a renderer
 * that only knows `kind: "section"` sets all of them the same way — a tracked
 * gold line with a rule after it, twelve times over. That is the fill-in-the-
 * blank look this module exists to remove.
 *
 * Two decisions worth keeping:
 *
 *  - **This is a reading, not a rewrite.** Blocks are derived at render time
 *    from the stored items. Nothing new is persisted, no published payload
 *    changes shape, and a guide published before this existed reads better the
 *    next time it is opened.
 *  - **At most one signpost per run.** A heading is a heading because content
 *    follows it. Six upper-case lines in a row are a list, and only the first
 *    of them can be its heading — which is what stops the rules multiplying.
 *
 * Every item that goes in comes out in exactly one block: the layout may
 * regroup lines, never drop them.
 *
 * Pure module: no React, no `next/*`, so the renderer and the tests share it.
 */

import {
  HONORIFIC,
  HYMN_CUE,
  MAX_LABEL_WORDS,
  MAX_ROLE_CHARS,
  ROLE_WORD,
  ROSTER_HEADING,
  VERSE_BREAK,
  isPersonLine,
  isShouted,
  splitLabelled,
  words,
} from "./programme-lines";
import type { GuideProgrammeItem } from "./types";

export { isShouted };

/** Longest title page we will read as one. Past this, it is a programme. */
const MAX_COVER_LINES = 10;
const MIN_COVER_LINES = 2;
/** A signpost is a short label. A sentence in capitals is an entry. */
const MAX_SIGNPOST_CHARS = 44;
const MAX_SIGNPOST_WORDS = 6;

export type ProgrammeCoverRole = "title" | "connector" | "name" | "meta";

export interface ProgrammeCoverLine {
  id: string;
  text: string;
  role: ProgrammeCoverRole;
  /** Written in capitals — a script face would be unreadable set that way. */
  shouted: boolean;
}

export interface ProgrammeScheduleEntry {
  id: string;
  time: string;
  title: string;
  description?: string;
  /**
   * A subscript rather than a thing that happens: the organizer wrote `> …`
   * with no item above it for the line to sit under. Set as detail, without
   * the mark and the weight an item of the running order gets.
   */
  note?: boolean;
}

export interface ProgrammeRosterPerson {
  id: string;
  /** `OFFICIATING MINISTER` — the role, when it was written on the same line. */
  label?: string;
  name: string;
  /** A parish, a title, a note — set under the name, never beside it. */
  notes: string[];
}

/** People under the role that introduces them: `COUNSELLORS`, then the two of them. */
export interface ProgrammeRosterGroup {
  id: string;
  title?: string;
  people: ProgrammeRosterPerson[];
}

/** A verse of a hymn, exactly as the organizer broke its lines. */
export interface ProgrammeHymnStanza {
  id: string;
  lines: string[];
}

export type ProgrammeBlock =
  | { kind: "cover"; id: string; lines: ProgrammeCoverLine[] }
  | { kind: "signpost"; id: string; title: string }
  | { kind: "roster"; id: string; groups: ProgrammeRosterGroup[] }
  | {
      kind: "hymn";
      id: string;
      /** `OPENING HYMN` — what the organizer called it, when they said. */
      cue?: string;
      title: string;
      time: string;
      stanzas: ProgrammeHymnStanza[];
    }
  | { kind: "appreciation"; id: string; title: string; lines: string[] }
  | { kind: "schedule"; id: string; entries: ProgrammeScheduleEntry[] };

/**
 * The words that join two names on a title page, on their own line.
 *
 * `OF` and `TO` are here because that is how the card is set — `THE WEDDING /
 * OF / Jeffery / AND / Francisca` — and a line holding one of these words and
 * nothing else is never an item of a programme.
 */
const CONNECTOR = /^(?:&|\+|and|between|with|of|to|weds|und|et|na|ne|y)[.,]?$/i;

const MONTH_OR_DAY =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

/** Nothing happens at a time on this line. */
function isTimeless(item: GuideProgrammeItem): boolean {
  return !item.time.trim();
}

/**
 * Time-less and carrying no detail of its own.
 *
 * A cover line and a signpost are both bare by definition. A person may well
 * have a line under them — their parish, their title — so a roster is read
 * from `isTimeless` instead.
 */
function isQuiet(item: GuideProgrammeItem): boolean {
  return isTimeless(item) && !(item.description ?? "").trim();
}

/**
 * Detail that is a stanza rather than a line about a person.
 *
 * A minister's parish is one short line under their name. A hymn is several,
 * and one of them breaks mid-clause on a comma or a semicolon. Anything that
 * reads this way is left out of a roster entirely: a verse folded in as
 * somebody's notes is how six lines of a hymn ended up as footnotes to a
 * person named `Captain of Israel's host, and Guide`.
 */
function carriesVerse(item: GuideProgrammeItem): boolean {
  const lines = (item.description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return false;
  return lines.length >= 3 || lines.some((line) => VERSE_BREAK.test(line));
}

/** A short label with nothing else on the line — `FUNCTIONARIES`, `CEREMONY`. */
function isBareSignpost(value: string): boolean {
  const text = value.trim();
  if (!text || /\d/.test(text) || CONNECTOR.test(text)) return false;
  if (!isShouted(text)) return false;
  return words(text).length <= 3 && text.length <= 28;
}

function isSignpost(item: GuideProgrammeItem): boolean {
  // The organizer wrote `> …` on this line. Whatever it looks like, they said
  // it was not a heading.
  if (item.kind === "note") return false;
  if (!isQuiet(item)) return false;
  const text = item.title.trim();
  if (!text || isPersonLine(text)) return false;
  if (item.kind !== "section" && !isShouted(text)) return false;
  return words(text).length <= MAX_SIGNPOST_WORDS && text.length <= MAX_SIGNPOST_CHARS;
}

/** A date, a clock or a venue — the small print at the foot of a title page. */
function looksLikeMeta(value: string): boolean {
  return /\d/.test(value) || MONTH_OR_DAY.test(value) || /^at\s/i.test(value.trim());
}

/**
 * What each line of a title page is doing.
 *
 * The couple are found by their connector — the line that reads only `AND` or
 * `BETWEEN` — rather than by counting lines, so a single name, three names or
 * a title page with no couple at all still reads correctly.
 */
function coverRoles(lines: string[]): ProgrammeCoverRole[] {
  const connectors = lines.map((line) => CONNECTOR.test(line));
  const roles: ProgrammeCoverRole[] = [];
  let namesDone = false;
  let inMeta = false;

  lines.forEach((line, index) => {
    if (connectors[index]) {
      roles.push("connector");
      return;
    }
    if (index === 0) {
      roles.push("title");
      return;
    }
    if (connectors[index - 1] || connectors[index + 1]) {
      roles.push("name");
      namesDone = true;
      return;
    }
    if (inMeta || namesDone || looksLikeMeta(line)) {
      inMeta = true;
      roles.push("meta");
      return;
    }
    roles.push("name");
    namesDone = true;
  });

  return roles;
}

/**
 * Take the title page off the front, if there is one.
 *
 * The run of opening time-less lines is trimmed back off anything that plainly
 * belongs to what follows — the heading of the next section, the first names
 * of a functionaries list — so the cover ends where the document does.
 */
function takeCover(items: GuideProgrammeItem[]): { lines: ProgrammeCoverLine[]; next: number } | null {
  if (items.length < 3) return null;

  let end = 0;
  // A cover line carries nothing under it, so a detail ends the title page.
  while (end < items.length && end < MAX_COVER_LINES && isQuiet(items[end]!)) end += 1;
  // Nothing follows it, so it is the programme itself rather than its cover.
  if (end >= items.length) return null;

  while (end > MIN_COVER_LINES) {
    const last = items[end - 1]!.title.trim();
    const previous = items[end - 2]!.title.trim();
    if (isBareSignpost(last)) {
      end -= 1;
      continue;
    }
    // A name still counts as cover while it sits beside its connector.
    if (isPersonLine(last) && !CONNECTOR.test(previous)) {
      end -= 1;
      continue;
    }
    break;
  }

  if (end < MIN_COVER_LINES) return null;

  const source = items.slice(0, end);
  const texts = source.map((item) => item.title.trim());
  if (!texts.some(isShouted)) return null;

  const roles = coverRoles(texts);
  // A title page names an occasion and dates it, or joins two names. Without
  // either it is just a list of items that happen to be in capitals.
  //
  // The date is asked of the lines themselves rather than of their roles:
  // every line after the first name is given the `meta` role whether it looks
  // like a date or not, so asking the roles was asking a question that always
  // answered yes — and a roster of ministers under `FUNCTIONARIES` was being
  // set as somebody's wedding invitation.
  const dated = texts.some(looksLikeMeta);
  if (!dated && !roles.some((role) => role === "connector")) return null;

  return {
    lines: source.map((item, index) => ({
      id: item.id,
      text: texts[index]!,
      role: roles[index]!,
      shouted: isShouted(texts[index]!),
    })),
    next: end,
  };
}

/**
 * A heading inside a run, rather than another line of it.
 *
 * At most one signpost per run is what stops six shouted lines becoming six
 * rules — but it also swallowed every heading in a programme that never
 * mentions a clock, so `GUEST MINISTERS`, `COUNSELORS` and `ORDER OF SERVICE`
 * came out as bullets in one flat column of forty-seven.
 *
 * The change of case is what tells them apart, and it is the organizer's own
 * signal. A shouted line followed by an ordinary-case one heads what follows:
 * `GUEST MINISTERS`, then three names. A shouted line followed by another
 * shouted line is one of a run: `PROCESSIONAL`, `OPENING HYMN`, `SERMON`.
 */
function headsWhatFollows(items: GuideProgrammeItem[], index: number): boolean {
  if (!isSignpost(items[index]!)) return false;
  const next = items[index + 1];
  return next !== undefined && isTimeless(next) && !isShouted(next.title.trim());
}

/**
 * The unbroken run of time-less lines starting at `from`.
 *
 * The run ends at the next heading, so a section only ever claims its own
 * lines. A line carrying a stanza ends it too, and so does a line the
 * organizer marked `>`: neither is a person, and letting either into a roster
 * is what turns a hymn into a list of ministers.
 */
function quietRun(items: GuideProgrammeItem[], from: number): GuideProgrammeItem[] {
  const run: GuideProgrammeItem[] = [];
  for (let index = from; index < items.length; index += 1) {
    const item = items[index]!;
    if (!isTimeless(item) || item.kind === "note" || carriesVerse(item)) break;
    if (index > from && headsWhatFollows(items, index)) break;
    run.push(item);
  }
  return run;
}

/**
 * A shouted heading that says outright that people follow it, and whose
 * detail is those people rather than a note about it.
 */
function namesPeople(item: GuideProgrammeItem): boolean {
  const text = item.title.trim();
  if (!isShouted(text) || !ROSTER_HEADING.test(text)) return false;
  return detailLines(item).every(isPersonLine);
}

function detailLines(item: GuideProgrammeItem): string[] {
  return (item.description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * A role that heads a list rather than a person in it.
 *
 * `OFFICIATING MINISTERS`, `GUEST MUSIC MINISTER`, `COUNSELLORS` — set in
 * capitals, naming a part rather than a human being, with the people who hold
 * it written underneath. Reading these as people is what flattens a roster
 * into one undifferentiated column of bulleted lines.
 *
 * When a run mixes capitals and ordinary case, the capitals are the headings:
 * that is the organizer telling us the hierarchy in the only way a plain text
 * box lets them.
 *
 * Detail normally disqualifies a line, because a name with a parish under it
 * is a person. The exception is a heading that says in so many words that
 * people follow — `OFFICIATING MINISTERS`, shouted, with a minister's full
 * title too long to have stayed on its own line. Read as a person, that
 * heading is set in the display serif as somebody actually called
 * "OFFICIATING MINISTERS", with the real minister demoted to a footnote.
 */
function isGroupHeader(
  item: GuideProgrammeItem,
  options: { mixedCaseRun: boolean }
): boolean {
  const text = item.title.trim();
  if (item.kind === "note") return false;
  if (!text) return false;
  if (splitLabelled(text).label || HONORIFIC.test(text)) return false;
  if ((item.description ?? "").trim() && !namesPeople(item)) return false;
  if (item.kind !== "section" && !isShouted(text)) return false;
  if (words(text).length > MAX_SIGNPOST_WORDS || text.length > MAX_SIGNPOST_CHARS) return false;
  if (ROLE_WORD.test(text) || ROSTER_HEADING.test(text)) return true;
  return options.mixedCaseRun && isShouted(text);
}

function runIsMixedCase(run: GuideProgrammeItem[]): boolean {
  return (
    run.some((item) => isShouted(item.title)) && run.some((item) => !isShouted(item.title))
  );
}

function isRosterRun(run: GuideProgrammeItem[], heading: string | null): boolean {
  if (run.length === 0) return false;
  const named = run.filter((item) => isPersonLine(item.title)).length;
  const ratio = named / run.length;
  // A heading that announces people vouches for the list under it, so a lone
  // minister still reads as a roster rather than as a thing that happens.
  if (heading && ROSTER_HEADING.test(heading)) return named >= 1 && ratio >= 0.5;
  if (run.length >= 2 && ratio >= 0.5) return true;

  // A list written as roles with people under them: the roles alone are not a
  // majority, but the shape is unmistakably a roster.
  const mixedCaseRun = runIsMixedCase(run);
  const headers = run.filter((item) => isGroupHeader(item, { mixedCaseRun })).length;
  return headers >= 1 && run.length > headers + 1;
}

/**
 * The list of people starting at `from`, or null if what is there is not one.
 *
 * A run of names can end on the heading of whatever comes next — `…ORGANIST:
 * MR. BOATENG`, `CEREMONY` — and that heading belongs to the next block, not
 * to this list. It is the only line a run ever gives back.
 */
function rosterRunAt(
  items: GuideProgrammeItem[],
  from: number,
  heading: string | null
): GuideProgrammeItem[] | null {
  let run = quietRun(items, from);
  const last = run[run.length - 1];
  if (
    run.length >= 2 &&
    from + run.length < items.length &&
    last &&
    isBareSignpost(last.title) &&
    !isPersonLine(last.title)
  ) {
    run = run.slice(0, -1);
  }
  return isRosterRun(run, heading) ? run : null;
}

/** A role on one line and the person on the next, as a printed programme sets it. */
function isRoleOnly(value: string): boolean {
  return (
    !HONORIFIC.test(value) &&
    value.length <= MAX_ROLE_CHARS &&
    ROLE_WORD.test(value) &&
    words(value).length <= MAX_LABEL_WORDS
  );
}

function isPersonOnly(value: string): boolean {
  if (HONORIFIC.test(value)) return true;
  return !ROLE_WORD.test(value) && words(value).length <= 5;
}

/**
 * A line that qualifies the person above it rather than naming another one.
 *
 * `(Assemblies of God, Adenta)` under a minister, or an ordinary-case line
 * beneath a name written in capitals. Kept conservative: when in doubt this
 * stays a person of their own, because demoting someone to a footnote is the
 * worse mistake.
 */
function isSubscriptOf(previous: GuideProgrammeItem | undefined, text: string): boolean {
  if (!previous) return false;
  if (splitLabelled(text).label || HONORIFIC.test(text)) return false;
  if (/^\(.*\)$/.test(text)) return true;
  return isShouted(previous.title) && !isShouted(text);
}

/**
 * Read a run of lines into roles, the people who hold them, and the notes
 * that belong under those people.
 *
 * Nothing is dropped: a heading with nobody under it keeps its own group, and
 * a detail the organizer indented is carried across as a note.
 */
function toRoster(run: GuideProgrammeItem[]): ProgrammeRosterGroup[] {
  const mixedCaseRun = runIsMixedCase(run);
  const groups: ProgrammeRosterGroup[] = [];
  let current: ProgrammeRosterGroup | null = null;

  const open = (group: ProgrammeRosterGroup) => {
    groups.push(group);
    current = group;
    return group;
  };

  for (let index = 0; index < run.length; index += 1) {
    const item = run[index]!;
    const text = item.title.trim();

    if (isGroupHeader(item, { mixedCaseRun })) {
      const group = open({ id: item.id, title: text, people: [] });
      // A heading whose detail is the people it announces — the first of them
      // ran too long to stay on a line of its own.
      detailLines(item).forEach((line, at) => {
        const { label, name } = splitLabelled(line);
        group.people.push({ id: `${item.id}-${at + 1}`, ...(label ? { label } : {}), name, notes: [] });
      });
      continue;
    }

    const group: ProgrammeRosterGroup = current ?? open({ id: item.id, people: [] });
    const last = group.people[group.people.length - 1];

    if (last && isSubscriptOf(run[index - 1], text)) {
      last.notes.push(text);
      continue;
    }

    const notes = detailLines(item);

    const { label, name } = splitLabelled(text);
    if (label) {
      group.people.push({ id: item.id, label, name, notes });
      continue;
    }

    // A role on one line and the person on the next, as a printed programme
    // sets it. Only ever folded together when the next line is plainly a name.
    const next = run[index + 1];
    if (next && !notes.length && isRoleOnly(text) && isPersonOnly(next.title.trim())) {
      const following = (next.description ?? "").trim();
      group.people.push({
        id: item.id,
        label: text,
        name: next.title.trim(),
        notes: following ? following.split("\n").map((line) => line.trim()).filter(Boolean) : [],
      });
      index += 1;
      continue;
    }

    group.people.push({ id: item.id, name: text, notes });
  }

  return groups;
}

/**
 * Something to be sung, rather than something that happens.
 *
 * A hymn arrives as a title with its verses underneath — and set on the
 * running order it becomes one bullet on the same rail as `Order of
 * photography`, six lines of poetry squeezed into the footnote slot. It is a
 * different kind of thing and it is read differently, so it is lifted out.
 *
 * The verse itself is the signal: a stanza breaks mid-clause on a comma or a
 * semicolon, and nobody ends `Cutting of the cake` that way. A cue the
 * organizer wrote above it — `OPENING HYMN`, `CHORUS` — vouches for a shorter
 * one that would not have qualified on its own.
 */
function isHymnItem(item: GuideProgrammeItem, cue: string | null): boolean {
  if (item.kind === "note" || item.kind === "section") return false;
  if (!item.title.trim()) return false;
  if (carriesVerse(item)) return true;
  if (!cue || !HYMN_CUE.test(cue)) return false;
  return detailLines(item).length >= 2;
}

/**
 * `OPENING HYMN` written on the line above the hymn's own title.
 *
 * Left in the running order it is a bullet with nothing under it, sitting
 * directly above the card it is announcing. It belongs to the hymn, so the
 * hymn takes it.
 */
function isHymnCueLine(item: GuideProgrammeItem): boolean {
  const text = item.title.trim();
  return (
    isQuiet(item) &&
    isShouted(text) &&
    HYMN_CUE.test(text) &&
    words(text).length <= MAX_SIGNPOST_WORDS &&
    text.length <= MAX_SIGNPOST_CHARS
  );
}

function toHymn(item: GuideProgrammeItem): Extract<ProgrammeBlock, { kind: "hymn" }> {
  // A blank line between two runs of verse is a stanza break, and it is the
  // only structure a hymn has. Single breaks stay the poet's line breaks.
  const stanzas = (item.description ?? "")
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map((lines, index) => ({ id: `${item.id}-verse-${index + 1}`, lines }));

  return {
    kind: "hymn",
    id: item.id,
    title: item.title.trim(),
    time: item.time.trim(),
    stanzas,
  };
}

/**
 * The line that opens the closing block of a programme.
 *
 * `APPRECIATION`, `ACKNOWLEDGEMENTS`, `THANK YOU` — the hosts turning from
 * the running order to speak to the room.
 */
const APPRECIATION_CUE =
  /^\W*(?:appreciation|acknowledge?ments?|acknowledgments?|thank[\s-]?you|our thanks|with (?:thanks|gratitude|love)|gratitude|in appreciation)\b/i;

/** A sentence that thanks the guests rather than telling them what is next. */
const THANKS_LINE = /\b(?:thank(?:s| you)|grateful|gratitude|honou?red to|blessed to)\b/i;

/** Long enough for a closing message, short enough never to eat a programme. */
const MAX_APPRECIATION_ITEMS = 8;

/**
 * Take the hosts' closing words off the end, if the programme has any.
 *
 * Only ever read from the tail, and only across time-less lines: a closing
 * block is by definition what is left after the last thing that happens at a
 * time. That is what stops `THANK YOU` said at 4:15pm — a real item of the
 * running order — from swallowing everything under it.
 */
function takeAppreciation(items: GuideProgrammeItem[], from: number): number | null {
  let start: number | null = null;

  for (let index = items.length - 1; index >= from; index -= 1) {
    const item = items[index]!;
    if (!isTimeless(item)) break;
    if (items.length - index > MAX_APPRECIATION_ITEMS) break;
    const title = item.title.trim();
    if (APPRECIATION_CUE.test(title) || THANKS_LINE.test(title)) start = index;
  }

  if (start === null) return null;

  // A list of people who helped is a roster, whatever it is headed with.
  const run = items.slice(start);
  if (isRosterRun(run, run[0]!.title)) return null;

  return start;
}

function toAppreciation(
  run: GuideProgrammeItem[]
): Extract<ProgrammeBlock, { kind: "appreciation" }> {
  const head = run[0]!;
  const headText = head.title.trim();
  // `APPRECIATION` on its own line is the heading of the card. A line that is
  // already a sentence of thanks is the message itself, and keeping it as a
  // heading would set the hosts' words in tracked capitals.
  const titled =
    APPRECIATION_CUE.test(headText) &&
    words(headText).length <= 3 &&
    !/[.!?]$/.test(headText);

  const lines: string[] = [];
  for (const item of run) {
    if (item !== head || !titled) lines.push(item.title.trim());
    lines.push(...detailLines(item));
  }

  return {
    kind: "appreciation",
    id: head.id,
    title: titled ? headText : "",
    lines: lines.filter(Boolean),
  };
}

function toScheduleEntry(item: GuideProgrammeItem): ProgrammeScheduleEntry {
  return {
    id: item.id,
    time: item.time.trim(),
    title: item.title,
    ...(item.description ? { description: item.description } : {}),
    ...(item.kind === "note" ? { note: true } : {}),
  };
}

/**
 * Read a stored programme into the blocks the guest's page renders.
 *
 * Deterministic and total: the same items always give the same blocks, and
 * every item lands in exactly one of them.
 */
export function layoutProgramme(items: GuideProgrammeItem[]): ProgrammeBlock[] {
  if (items.length === 0) return [];

  const blocks: ProgrammeBlock[] = [];
  let index = 0;

  const cover = takeCover(items);
  if (cover) {
    blocks.push({ kind: "cover", id: cover.lines[0]!.id, lines: cover.lines });
    index = cover.next;
  }

  // The hosts' closing words are taken off the end before the running order is
  // read, so nothing in the loop below can claim them as items.
  const closing = takeAppreciation(items, index);
  const end = closing ?? items.length;

  while (index < end) {
    /*
     * Lines that follow a signpost belong to the section it opened. They are
     * taken as entries even when they are in capitals, so a run of shouted
     * lines can never become a run of headings.
     */
    let claimed = 0;
    let cue: string | null = null;
    const head = items[index]!;

    if (isSignpost(head)) {
      blocks.push({ kind: "signpost", id: head.id, title: head.title });
      cue = head.title;
      index += 1;

      const roster = rosterRunAt(items, index, head.title);
      if (roster) {
        blocks.push({ kind: "roster", id: roster[0]!.id, groups: toRoster(roster) });
        index += roster.length;
        continue;
      }
      claimed = quietRun(items, index).length;
    } else {
      const roster = rosterRunAt(items, index, null);
      if (roster) {
        blocks.push({ kind: "roster", id: roster[0]!.id, groups: toRoster(roster) });
        index += roster.length;
        continue;
      }
    }

    /*
     * A hymn interrupts the running order rather than joining it: the entries
     * gathered so far are closed off, the hymn is set as its own block, and
     * whatever follows starts a fresh schedule. That is what keeps six lines
     * of verse off the same rail as `Order of photography`.
     */
    const entries: ProgrammeScheduleEntry[] = [];
    const flush = () => {
      if (entries.length === 0) return;
      blocks.push({ kind: "schedule", id: entries[0]!.id, entries: entries.slice() });
      entries.length = 0;
    };

    let taken = 0;
    let pendingCue: string | null = null;

    while (index < end) {
      const item = items[index]!;
      if (taken >= claimed) {
        if (isSignpost(item)) break;
        if (entries.length > 0 && rosterRunAt(items, index, null)) break;
      }

      const next = items[index + 1];
      if (
        pendingCue === null &&
        isHymnCueLine(item) &&
        next !== undefined &&
        index + 1 < end &&
        isHymnItem(next, item.title)
      ) {
        pendingCue = item.title.trim();
        index += 1;
        taken += 1;
        continue;
      }

      if (isHymnItem(item, pendingCue ?? cue)) {
        flush();
        blocks.push({ ...toHymn(item), ...(pendingCue ? { cue: pendingCue } : {}) });
        pendingCue = null;
        index += 1;
        taken += 1;
        continue;
      }

      // A cue we picked up but that turned out to announce nothing sung goes
      // back on the running order — it is still a line the organizer wrote.
      if (pendingCue !== null) {
        entries.push({ id: `${item.id}-cue`, time: "", title: pendingCue });
        pendingCue = null;
      }

      entries.push(toScheduleEntry(item));
      index += 1;
      taken += 1;
    }

    if (pendingCue !== null) {
      entries.push({ id: `${items[index - 1]!.id}-cue`, time: "", title: pendingCue });
    }

    flush();
  }

  if (closing !== null) {
    blocks.push(toAppreciation(items.slice(closing)));
  }

  return blocks;
}
