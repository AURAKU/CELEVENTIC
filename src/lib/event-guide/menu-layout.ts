/**
 * Reading a menu into the courses a guest is actually served.
 *
 * A caterer does not fill in a form. They send a paragraph, and an organizer
 * pastes it whole:
 *
 *     *APPETIZER*
 *     Samosa
 *     Spring rolls
 *     *MAIN DISHES*
 *     Jollof rice
 *     Grilled tilapia
 *
 * — or the same thing on one line, or with `APPETIZER:` instead of asterisks,
 * or with nothing but a blank line between the courses. Set verbatim in a
 * pre-wrapped box, all of those read as a notepad. Read into courses, they
 * read as dinner.
 *
 * Two promises this module keeps:
 *
 *  - **Nothing is left off the menu.** Every non-blank line of what the
 *    organizer wrote comes out as a heading or as an item, exactly once. A
 *    parser that silently drops a dish is worse than the notepad.
 *  - **This is a reading, not a rewrite.** Courses are derived at render time
 *    from the stored body. Nothing new is persisted, no published payload
 *    changes shape, and a menu published before this existed reads better the
 *    next time a guest opens it.
 *
 * Pure module: no React, no `next/*`, so the guest's page, the organizer's
 * preview and the tests all share one reading.
 */

import { isShouted, words } from "./programme-lines";
import type { GuideMenu } from "./types";

/** What a course is, as far as the page's iconography is concerned. */
export const MENU_COURSE_KINDS = [
  "welcome",
  "starter",
  "soup",
  "main",
  "side",
  "dessert",
  "drink",
  "note",
  "course",
] as const;
export type MenuCourseKind = (typeof MENU_COURSE_KINDS)[number];

export interface MenuCourseItem {
  id: string;
  name: string;
}

export interface MenuCourse {
  id: string;
  /** Empty when the organizer wrote dishes with no course above them. */
  heading: string;
  kind: MenuCourseKind;
  items: MenuCourseItem[];
}

export interface MenuLayout {
  courses: MenuCourse[];
  /** A menu with a link or a PDF but no text of its own still renders. */
  isEmpty: boolean;
}

/** A caterer's word for a course, in the order we test them. */
const KIND_PATTERNS: Array<{ kind: MenuCourseKind; pattern: RegExp }> = [
  { kind: "welcome", pattern: /\b(?:welcome|reception|arrival|canap[ée]|cocktail|amuse)/i },
  { kind: "soup", pattern: /\b(?:soup|salad|broth|light bite)/i },
  { kind: "starter", pattern: /\b(?:starter|appetiser|appetizer|appetite|hors|entr[ée]e?s?\b(?!\s*\/)|first course|small chops|finger food)/i },
  { kind: "main", pattern: /\b(?:main|entree|entr[ée]e|principal|second course|buffet|hot dish|carver|from the grill|protein)/i },
  { kind: "side", pattern: /\b(?:side|accompani|extra|condiment|sauce|garnish)/i },
  { kind: "dessert", pattern: /\b(?:dessert|sweet|pudding|cake|pastr|ice cream|fruit)/i },
  { kind: "drink", pattern: /\b(?:drink|beverage|bar|wine|juice|refreshment|toast|champagne|mocktail|water)/i },
  { kind: "note", pattern: /\b(?:note|allerg|dietar|vegetarian|vegan|halal|gluten|kindly|please)/i },
];

/** The course a heading names, for the glyph set beside it. */
export function menuCourseKind(heading: string): MenuCourseKind {
  const text = heading.trim();
  if (!text) return "course";
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (pattern.test(text)) return kind;
  }
  return "course";
}

/** `- `, `• `, `1. `, `2) ` — the marks a pasted list carries. */
const LIST_MARK = /^\s*(?:[-–—•·▪◦*+]+|\(?\d{1,2}[.)])\s+/;
/** `*APPETIZER*`, `**MAIN**`, `_Dessert_` — a heading an organizer emphasised. */
const EMPHASIS_LINE = /^\s*(?:\*{1,3}|_{1,3})\s*([^*_\n][^*_\n]*?)\s*(?:\*{1,3}|_{1,3})\s*$/;
/** `# Dessert` — a heading an organizer wrote in markdown. */
const MD_HEADING = /^\s*#{1,6}\s*(.+?)\s*$/;
/** An emphasis group written mid-line, which is a heading wherever it appears. */
const INLINE_EMPHASIS = /\*{1,3}\s*[^*\n]{1,64}?\s*\*{1,3}/g;
/** `APPETIZER:` or `Appetizer: samosa, spring rolls`. */
const LABELLED = /^\s*([^:\n]{2,44}?)\s*:\s*(.*)$/;

/** A heading is a label, never a sentence. */
const MAX_HEADING_CHARS = 44;
const MAX_HEADING_WORDS = 6;

const MAX_COURSES = 24;
const MAX_ITEMS_PER_COURSE = 60;

function stripListMark(value: string): string {
  return value.replace(LIST_MARK, "").trim();
}

function looksLikeHeadingText(value: string): boolean {
  const text = value.trim().replace(/[:.]$/, "");
  if (!text) return false;
  if (text.length > MAX_HEADING_CHARS) return false;
  if (words(text).length > MAX_HEADING_WORDS) return false;
  // A price or a quantity belongs to a dish, not to the course above it.
  return !/\d\s*(?:pcs?|pieces?|portions?)\b/i.test(text);
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "course"
  );
}

type Read =
  | { type: "heading"; text: string }
  | { type: "item"; text: string }
  | { type: "blank" };

/**
 * What one line of the organizer's menu is doing.
 *
 * The order matters. An emphasised or markdown line is a heading because the
 * organizer said so, whatever it says. `Appetizer:` is a heading because of
 * the colon. A bare line is a heading only when it is shouted and short —
 * which is the one signal a plain text box gives an organizer who wants a
 * hierarchy.
 */
function readLine(raw: string): Read {
  const line = raw.trim();
  if (!line) return { type: "blank" };

  const emphasised = line.match(EMPHASIS_LINE);
  if (emphasised?.[1] && looksLikeHeadingText(emphasised[1])) {
    return { type: "heading", text: emphasised[1].trim().replace(/:$/, "") };
  }

  const md = line.match(MD_HEADING);
  if (md?.[1] && !LIST_MARK.test(line) && looksLikeHeadingText(md[1])) {
    return { type: "heading", text: md[1].trim().replace(/:$/, "") };
  }

  // A list mark makes it a dish no matter how it is written — `- STARTERS`
  // under a heading is a dish an organizer typed in capitals.
  const marked = LIST_MARK.test(line);
  const text = stripListMark(line);
  if (!text) return { type: "blank" };
  if (marked) return { type: "item", text };

  const labelled = text.match(LABELLED);
  if (labelled?.[1] && looksLikeHeadingText(labelled[1]) && !/\bhttps?$/i.test(labelled[1])) {
    const rest = (labelled[2] ?? "").trim();
    // `Appetizer: samosa` is a heading with its first dish on the same line;
    // the caller splits the remainder.
    return rest
      ? { type: "heading", text: `${labelled[1].trim()}\u0000${rest}` }
      : { type: "heading", text: labelled[1].trim() };
  }

  if (isShouted(text) && looksLikeHeadingText(text)) {
    return { type: "heading", text: text.replace(/:$/, "") };
  }

  return { type: "item", text };
}

/**
 * Dishes an organizer ran together on one line.
 *
 * Only ever applied where a line break was not available to them — a menu
 * written across several lines is trusted exactly as written, because
 * `Grilled tilapia, banku and pepper sauce` is one dish and splitting it
 * would invent two.
 */
function splitRun(value: string): string[] {
  const parts = value
    .split(/\s*[;,]\s*|\s{2,}[·•]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [value.trim()].filter(Boolean);
}

/**
 * Put an emphasised heading written mid-line onto a line of its own.
 *
 * `*APPETIZER* Samosa Spring rolls *MAIN DISHES* Jollof` is one line as far
 * as the textarea is concerned, and three courses as far as the guest is.
 */
function explodeInlineHeadings(body: string): string {
  return body.replace(INLINE_EMPHASIS, (match) => `\n${match}\n`);
}

/**
 * Read the organizer's menu text into courses.
 *
 * Exported for the tests, which assert the promise that matters: every line
 * that went in comes out.
 */
export function parseMenuBody(body: string): MenuCourse[] {
  const source = body.trim();
  if (!source) return [];

  // Without a line break of their own, commas are the only separator the
  // organizer had.
  const oneLine = !/\r?\n/.test(source);
  const reads = explodeInlineHeadings(source)
    .split(/\r?\n/)
    .map(readLine)
    .filter((read): read is Exclude<Read, { type: "blank" }> => read.type !== "blank");

  if (reads.length === 0) return [];

  const headed = reads.some((read) => read.type === "heading");
  const courses: MenuCourse[] = [];

  const open = (heading: string): MenuCourse => {
    const course: MenuCourse = {
      id: `menu-${courses.length + 1}-${slug(heading || "course")}`,
      heading,
      kind: menuCourseKind(heading),
      items: [],
    };
    courses.push(course);
    return course;
  };

  const push = (course: MenuCourse, text: string) => {
    for (const name of oneLine ? splitRun(text) : [text]) {
      if (!name) continue;
      if (course.items.length >= MAX_ITEMS_PER_COURSE) return;
      course.items.push({ id: `${course.id}-${course.items.length + 1}`, name });
    }
  };

  if (headed) {
    let current: MenuCourse | null = null;
    for (const read of reads) {
      if (read.type === "heading") {
        if (courses.length >= MAX_COURSES) {
          // Past the ceiling every remaining line still has to land somewhere,
          // so it lands as a dish rather than being dropped.
          if (current) push(current, read.text.replace("\u0000", " "));
          continue;
        }
        const [heading, inline] = read.text.split("\u0000");
        current = open(heading ?? "");
        if (inline) push(current, inline);
        continue;
      }
      push(current ?? (current = open("")), read.text);
    }
    return courses.filter((course) => course.heading || course.items.length > 0);
  }

  /*
   * No headings anywhere, which means the organizer gave us no signal at all:
   * nothing emphasised, nothing shouted, no colons, no markdown. A blank line
   * is then the only grouping they left, and it groups — it does not name.
   *
   * Promoting the first line of each group to a course was tempting and
   * wrong: `Groundnut soup / Kelewele` is two dishes, and reading the first
   * as the course they belong to sets a dish as a heading and invents a
   * hierarchy the organizer never wrote.
   */
  for (const group of source.split(/\r?\n\s*\r?\n/)) {
    const lines = group
      .split(/\r?\n/)
      .map((line) => stripListMark(line))
      .filter(Boolean);
    if (lines.length === 0) continue;

    const course =
      courses.length >= MAX_COURSES ? courses[courses.length - 1]! : open("");
    for (const line of lines) push(course, line);
  }

  return courses.filter((course) => course.heading || course.items.length > 0);
}

/**
 * The menu a guest's page renders.
 *
 * Structured sections an organizer built in the form come first and as
 * written; anything they typed as free text is read into courses after them.
 * Both routes end in the same shape, so the page has one thing to draw.
 */
export function layoutMenu(menu: GuideMenu): MenuLayout {
  const courses: MenuCourse[] = [];

  for (const section of menu.sections) {
    const heading = section.heading.trim();
    const items = section.items.map((name) => name.trim()).filter(Boolean);
    if (!heading && items.length === 0) continue;
    courses.push({
      id: section.id,
      heading,
      kind: menuCourseKind(heading),
      items: items.map((name, index) => ({ id: `${section.id}-${index + 1}`, name })),
    });
  }

  courses.push(...parseMenuBody(menu.body));

  return { courses, isEmpty: courses.length === 0 };
}
