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

import type { GuideProgrammeItem } from "./types";

/** Longest title page we will read as one. Past this, it is a programme. */
const MAX_COVER_LINES = 10;
const MIN_COVER_LINES = 2;
/** A signpost is a short label. A sentence in capitals is an entry. */
const MAX_SIGNPOST_CHARS = 44;
const MAX_SIGNPOST_WORDS = 6;
/** A role label ahead of a name (`OFFICIATING MINISTER: …`). */
const MAX_LABEL_WORDS = 6;
const MAX_ROLE_CHARS = 48;

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

export type ProgrammeBlock =
  | { kind: "cover"; id: string; lines: ProgrammeCoverLine[] }
  | { kind: "signpost"; id: string; title: string }
  | { kind: "roster"; id: string; groups: ProgrammeRosterGroup[] }
  | { kind: "schedule"; id: string; entries: ProgrammeScheduleEntry[] };

/**
 * The words that join two names on a title page, on their own line.
 *
 * `OF` and `TO` are here because that is how the card is set — `THE WEDDING /
 * OF / Jeffery / AND / Francisca` — and a line holding one of these words and
 * nothing else is never an item of a programme.
 */
const CONNECTOR = /^(?:&|\+|and|between|with|of|to|weds|und|et|na|ne|y)[.,]?$/i;

/**
 * How a person is announced on a programme, in the registers Ghanaian and
 * diaspora organizers actually write: church and chieftaincy titles alongside
 * the academic and professional ones.
 */
const HONORIFIC =
  /^(?:rev(?:e?rend)?|revd|pastor|ps|bishop|archbishop|apostle|prophet(?:ess)?|evangelist|elder|deacon(?:ess)?|catechist|imam|sheikh|alhaji|hajia|nana|nii|naa|togbe|torgbui|mallam|osofo|opanyin|chief|dr|mr|mrs|ms|miss|prof(?:essor)?|sir|lady|madam|hon|barr|engr|capt|col|gen|lt|maj)\b\.?/i;

/**
 * A part someone plays, rather than a thing that happens at a time.
 *
 * Plurals are spelled out because a programme heads its lists in the plural —
 * `OFFICIATING MINISTERS`, `COUNSELLORS` — and that heading is exactly the
 * line this has to recognise.
 */
const ROLE_WORD =
  /\b(?:ministers?|officiant|officiating|celebrants?|clergy|priests?|chaplains?|counsell?ors?|organists?|pianists?|instrumentalists?|choir|choristers?|soloists?|band|drummers?|m\.?c\.?|comperes?|master of ceremonies|toastmasters?|ushers?|usherettes?|best man|maid of honou?r|matron of honou?r|bridesmaids?|groomsmen|groomsman|ring bearers?|flower girls?|page boys?|chair(?:man|men|person|lady)?|preachers?|readers?|witness(?:es)?|patron(?:ess)?s?|coordinators?|planners?|photographers?|videographers?|dj|linguists?|interpreters?|translators?|secretary|treasurer|caterers?|decorators?|florists?|protocol|sponsors?|godparents?|elders|hosts?|hostess)\b/i;

/** A heading that announces people rather than a stretch of the day. */
const ROSTER_HEADING =
  /\b(?:functionar(?:y|ies)|officials?|officiating|ministers?|clergy|counsell?ors?|personnel|participants?|principals?|bridal (?:party|train)|entourage|committee|team|choir|ushers?|dignitar(?:y|ies)|honou?red guests?|special guests?|patrons?)\b/i;

const MONTH_OR_DAY =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

/**
 * Written in capitals.
 *
 * Scripts without letter case — Arabic, Chinese, Hebrew — are never "shouted",
 * which is what keeps this from reading a whole Chinese programme as a title
 * page.
 */
export function isShouted(value: string): boolean {
  const letters = value.replace(/[^\p{L}]/gu, "");
  return (
    letters.length >= 2 &&
    letters === letters.toLocaleUpperCase() &&
    letters !== letters.toLocaleLowerCase()
  );
}

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
 * `OFFICIATING MINISTER: REV. ANNAN` → a label and a name.
 *
 * A colon between two digits is a clock, never a label: `AT 2:00 PM` on a
 * title page is the hour the ceremony starts, and reading it as the role
 * "AT 2" held by a person called "00 PM" is how a date and a time end up in
 * the wrong block entirely.
 */
function splitLabelled(value: string): { label?: string; name: string } {
  for (let at = value.indexOf(":"); at > 0; at = value.indexOf(":", at + 1)) {
    if (at >= value.length - 1) break;
    if (/\d/.test(value[at - 1] ?? "") && /\d/.test(value[at + 1] ?? "")) continue;

    const label = value.slice(0, at).trim();
    const name = value.slice(at + 1).trim();
    if (!label || !name) break;
    if (!/\p{L}/u.test(label) || words(label).length > MAX_LABEL_WORDS) break;
    return { label, name };
  }
  return { name: value };
}

/** A line that announces a person: a role, a title, or `role: name`. */
function isRosterLine(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (splitLabelled(text).label) return true;
  if (HONORIFIC.test(text)) return true;
  return text.length <= MAX_ROLE_CHARS && ROLE_WORD.test(text);
}

/** A short label with nothing else on the line — `FUNCTIONARIES`, `CEREMONY`. */
function isBareSignpost(value: string): boolean {
  const text = value.trim();
  if (!text || /\d/.test(text) || CONNECTOR.test(text)) return false;
  if (!isShouted(text)) return false;
  return words(text).length <= 3 && text.length <= 28;
}

function isSignpost(item: GuideProgrammeItem): boolean {
  if (!isQuiet(item)) return false;
  const text = item.title.trim();
  if (!text || isRosterLine(text)) return false;
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
    if (isRosterLine(last) && !CONNECTOR.test(previous)) {
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
  if (!roles.some((role) => role === "connector" || role === "meta")) return null;

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

/** The unbroken run of time-less lines starting at `from`. */
function quietRun(items: GuideProgrammeItem[], from: number): GuideProgrammeItem[] {
  const run: GuideProgrammeItem[] = [];
  for (let index = from; index < items.length && isTimeless(items[index]!); index += 1) {
    run.push(items[index]!);
  }
  return run;
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
 */
function isGroupHeader(
  item: GuideProgrammeItem,
  options: { mixedCaseRun: boolean }
): boolean {
  const text = item.title.trim();
  if (!text || (item.description ?? "").trim()) return false;
  if (splitLabelled(text).label || HONORIFIC.test(text)) return false;
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
  const named = run.filter((item) => isRosterLine(item.title)).length;
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
    !isRosterLine(last.title)
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
      open({ id: item.id, title: text, people: [] });
      continue;
    }

    const group: ProgrammeRosterGroup = current ?? open({ id: item.id, people: [] });
    const last = group.people[group.people.length - 1];

    if (last && isSubscriptOf(run[index - 1], text)) {
      last.notes.push(text);
      continue;
    }

    const detail = (item.description ?? "").trim();
    const notes = detail ? detail.split("\n").map((line) => line.trim()).filter(Boolean) : [];

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

function toScheduleEntry(item: GuideProgrammeItem): ProgrammeScheduleEntry {
  return {
    id: item.id,
    time: item.time.trim(),
    title: item.title,
    ...(item.description ? { description: item.description } : {}),
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

  while (index < items.length) {
    /*
     * Lines that follow a signpost belong to the section it opened. They are
     * taken as entries even when they are in capitals, so a run of shouted
     * lines can never become a run of headings.
     */
    let claimed = 0;
    const head = items[index]!;

    if (isSignpost(head)) {
      blocks.push({ kind: "signpost", id: head.id, title: head.title });
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

    const entries: ProgrammeScheduleEntry[] = [];
    let taken = 0;
    while (index < items.length) {
      const item = items[index]!;
      if (taken >= claimed) {
        if (isSignpost(item)) break;
        if (entries.length > 0 && rosterRunAt(items, index, null)) break;
      }
      entries.push(toScheduleEntry(item));
      index += 1;
      taken += 1;
    }

    if (entries.length > 0) {
      blocks.push({ kind: "schedule", id: entries[0]!.id, entries });
    }
  }

  return blocks;
}
