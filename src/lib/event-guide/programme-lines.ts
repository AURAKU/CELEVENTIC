/**
 * What a single line of a programme looks like, before anything is decided
 * about where it belongs.
 *
 * Two modules need the same answers. `programme-script` asks them while it is
 * reading the organizer's document — is this line a stanza of the hymn above
 * it, or the next thing that happens? `programme-layout` asks them again at
 * render time — is this line a person, or the heading of a list of people?
 * They were once two copies of the same regular expressions, which is how a
 * role recognised by one and missed by the other put a hymn's verses into a
 * roster of ministers.
 *
 * Pure module: no React, no `next/*`, no Prisma.
 */

/** A role label ahead of a name (`OFFICIATING MINISTER: …`). */
export const MAX_LABEL_WORDS = 6;
export const MAX_ROLE_CHARS = 48;

export function words(value: string): string[] {
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

/**
 * How a person is announced on a programme, in the registers Ghanaian and
 * diaspora organizers actually write: church and chieftaincy titles alongside
 * the academic and professional ones.
 */
export const HONORIFIC =
  /^(?:rev(?:e?rend)?|revd|pastor|ps|bishop|archbishop|apostle|prophet(?:ess)?|evangelist|elder|deacon(?:ess)?|catechist|imam|sheikh|alhaji|hajia|nana|nii|naa|togbe|torgbui|mallam|osofo|opanyin|chief|dr|mr|mrs|ms|miss|prof(?:essor)?|sir|lady|madam|hon|barr|engr|capt|col|gen|lt|maj)\b\.?/i;

/**
 * A part someone plays, rather than a thing that happens at a time.
 *
 * Plurals are spelled out because a programme heads its lists in the plural —
 * `OFFICIATING MINISTERS`, `COUNSELLORS` — and that heading is exactly the
 * line this has to recognise.
 */
export const ROLE_WORD =
  /\b(?:ministers?|officiant|officiating|celebrants?|clergy|priests?|chaplains?|counsell?ors?|organists?|pianists?|instrumentalists?|choir|choristers?|soloists?|band|drummers?|m\.?c\.?|comperes?|master of ceremonies|toastmasters?|ushers?|usherettes?|best man|maid of honou?r|matron of honou?r|bridesmaids?|groomsmen|groomsman|ring bearers?|flower girls?|page boys?|chair(?:man|men|person|lady)?|preachers?|readers?|witness(?:es)?|patron(?:ess)?s?|coordinators?|planners?|photographers?|videographers?|dj|linguists?|interpreters?|translators?|secretary|treasurer|caterers?|decorators?|florists?|protocol|sponsors?|godparents?|elders|hostess(?:es)?)\b/i;

/** A heading that announces people rather than a stretch of the day. */
export const ROSTER_HEADING =
  /\b(?:functionar(?:y|ies)|officials?|officiating|ministers?|clergy|counsell?ors?|personnel|participants?|principals?|bridal (?:party|train)|entourage|committee|team|choir|ushers?|dignitar(?:y|ies)|honou?red guests?|special guests?|patrons?)\b/i;

/**
 * A line that announces something with words to be sung under it.
 *
 * `OPENING HYMN` is followed by the hymn's title, and that title is followed
 * by its stanzas — none of which are items of the running order. Deliberately
 * excludes `PROCESSIONAL` and `RECESSIONAL`: those are things that happen,
 * and organizers write them as items far more often than as music cues.
 */
export const HYMN_CUE =
  /\b(?:hymns?|chorus(?:es)?|anthems?|psalms?|canticles?|songs?|refrains?|stanzas?|verses?|worship|praises?)\b/i;

/**
 * How a line of verse ends: mid-clause, on a comma or a semicolon.
 *
 * This is the one mark that separates a stanza from a running order. No
 * organizer ends `Cutting of the cake` on a semicolon, and every hymn in the
 * book ends half its lines on one.
 */
export const VERSE_BREAK = /[,;][")'”’]?$/;

/**
 * `OFFICIATING MINISTER: REV. ANNAN` → a label and a name.
 *
 * A colon between two digits is a clock, never a label: `AT 2:00 PM` on a
 * title page is the hour the ceremony starts, and reading it as the role
 * "AT 2" held by a person called "00 PM" is how a date and a time end up in
 * the wrong block entirely.
 */
export function splitLabelled(value: string): { label?: string; name: string } {
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

/**
 * A line that announces a person: a role, a title, or `role: name`.
 *
 * A label and an honorific are conclusive. A bare role word is not: hymns are
 * full of ordinary words that a roster also uses, so a line that breaks
 * mid-clause on a comma or a semicolon is left to the verse reader rather
 * than claimed as somebody's name.
 */
export function isPersonLine(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (splitLabelled(text).label) return true;
  if (HONORIFIC.test(text)) return true;
  if (VERSE_BREAK.test(text)) return false;
  return text.length <= MAX_ROLE_CHARS && ROLE_WORD.test(text);
}
