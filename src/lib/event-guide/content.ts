/**
 * Event Guide content composition.
 *
 * The guide does not own a second copy of the programme or the menu. It
 * composes what the event already has — the invitation's studio programme and
 * the Event Companion menu — and only prefers its own values when an organizer
 * has explicitly edited them in the guide builder.
 *
 * Pure module: no Prisma, no `next/*`, so it is shared by the server, the
 * offline pack builder and the tests.
 */

import { readCompanionMenuConfig } from "@/lib/admission/companion-studio";
import type { WeddingBoardProgrammeItem } from "@/lib/invitation/wedding-board";
import type {
  GuideAttachment,
  GuideMenu,
  GuideMenuSection,
  GuideProgrammeItem,
} from "./types";

/**
 * Caps sized for a programme an organizer actually pastes.
 *
 * The old ceilings (60 items, 400 characters of detail) were written for a
 * hand-typed list. The programme script is a document — an order of service
 * with readings, soloists and a note under half of them — and the promise made
 * in the editor is that nothing is left out, so the ceilings are the size of a
 * long real programme rather than of a form.
 */
const MAX_PROGRAMME_ITEMS = 150;
const MAX_MENU_SECTIONS = 20;
const MAX_ATTACHMENTS = 6;
const MAX_TEXT = 400;
const MAX_TITLE = 200;
const MAX_DETAIL = 2000;
const MAX_MENU_BODY = 8000;
export const MAX_PROGRAMME_SCRIPT_CHARS = 20_000;

function text(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
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

/** Only same-origin paths and absolute http(s) URLs may reach a guest. */
export function safePublicUrl(value: unknown): string | null {
  const raw = text(value, 2048);
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeProgrammeItems(raw: unknown): GuideProgrammeItem[] {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).items)
      ? ((raw as Record<string, unknown>).items as unknown[])
      : null;
  if (!source) return [];

  const items: GuideProgrammeItem[] = [];
  for (const entry of source.slice(0, MAX_PROGRAMME_ITEMS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const title = text(row.title, MAX_TITLE);
    if (!title) continue;
    const description = text(row.description ?? row.detail, MAX_DETAIL);
    items.push({
      id: text(row.id, 64) || `prog-${items.length + 1}-${slugFragment(title)}`,
      time: text(row.time, 40),
      title,
      ...(description ? { description } : {}),
      ...(row.kind === "section" ? { kind: "section" as const } : {}),
    });
  }
  return items;
}

/**
 * Read a stored programme draft in either shape it can have on disk.
 *
 * The column began life as a bare array of items. Since the editor became a
 * script — one document the organizer types or pastes — the draft is stored as
 * `{ script, items }`: the script is what the organizer wrote, the items are
 * what we derived from it for guests and for the offline pack. Older rows are
 * still arrays and still read correctly, with an empty script that the editor
 * rebuilds from the items.
 */
export function readProgrammeDraft(raw: unknown): { script: string; items: GuideProgrammeItem[] } {
  const items = normalizeProgrammeItems(raw);
  const script =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? text((raw as Record<string, unknown>).script, MAX_PROGRAMME_SCRIPT_CHARS)
      : "";
  return { script, items };
}

export function programmeItemsFromWeddingBoard(
  items: WeddingBoardProgrammeItem[] | null | undefined
): GuideProgrammeItem[] {
  return normalizeProgrammeItems(items ?? []);
}

export function normalizeMenu(raw: unknown): GuideMenu {
  const cfg = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sectionsRaw = Array.isArray(cfg.sections) ? cfg.sections : [];
  const sections: GuideMenuSection[] = [];
  for (const entry of sectionsRaw.slice(0, MAX_MENU_SECTIONS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const heading = text(row.heading, 120);
    const items = Array.isArray(row.items)
      ? row.items.map((i) => text(i, 200)).filter(Boolean).slice(0, 40)
      : [];
    if (!heading && items.length === 0) continue;
    sections.push({
      id: text(row.id, 64) || `menu-${sections.length + 1}-${slugFragment(heading || "section")}`,
      heading: heading || "Menu",
      items,
    });
  }

  return {
    body: text(cfg.body ?? cfg.menuBody, MAX_MENU_BODY),
    sections,
    url: safePublicUrl(cfg.url ?? cfg.menuUrl),
  };
}

export function normalizeAttachments(raw: unknown): GuideAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: GuideAttachment[] = [];
  for (const entry of raw.slice(0, MAX_ATTACHMENTS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const url = safePublicUrl(row.url);
    if (!url) continue;
    out.push({
      label: text(row.label, 80) || "Attachment",
      url,
      kind: row.kind === "image" ? "image" : "pdf",
    });
  }
  return out;
}

export function menuHasContent(menu: GuideMenu): boolean {
  return Boolean(menu.body.trim() || menu.sections.length > 0 || menu.url);
}

/**
 * Compose the guide's live (draft-time) content.
 *
 * Precedence per field: the guide's own edit, then the invitation source, then
 * empty. Programme and menu resolve independently, so editing only the menu
 * still leaves the programme inherited from the invitation.
 */
export function resolveGuideContent(input: {
  programmeDraft: unknown;
  menuDraft: unknown;
  attachments: unknown;
  invitationProgrammeItems: WeddingBoardProgrammeItem[] | null | undefined;
  invitationFeatureConfig: unknown;
}): {
  programme: GuideProgrammeItem[];
  /** What the organizer typed, when the guide owns the programme. */
  programmeScript: string;
  menu: GuideMenu;
  attachments: GuideAttachment[];
  programmeSource: "guide" | "invitation" | "empty";
  menuSource: "guide" | "invitation" | "empty";
} {
  const draft = readProgrammeDraft(input.programmeDraft);
  const guideProgramme = draft.items;
  const invitationProgramme = programmeItemsFromWeddingBoard(input.invitationProgrammeItems);
  const programme = guideProgramme.length > 0 ? guideProgramme : invitationProgramme;

  const guideMenu = normalizeMenu(input.menuDraft);
  const invitationMenu = normalizeMenu(readCompanionMenuConfig(input.invitationFeatureConfig));
  const menu = menuHasContent(guideMenu) ? guideMenu : invitationMenu;

  return {
    programme,
    programmeScript: guideProgramme.length > 0 ? draft.script : "",
    menu,
    attachments: normalizeAttachments(input.attachments),
    programmeSource:
      guideProgramme.length > 0 ? "guide" : invitationProgramme.length > 0 ? "invitation" : "empty",
    menuSource: menuHasContent(guideMenu)
      ? "guide"
      : menuHasContent(invitationMenu)
        ? "invitation"
        : "empty",
  };
}

const GUIDE_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * `Thursday, 6 August 2026`, on every runtime.
 *
 * Assembled from the formatted parts rather than taken from the locale's own
 * pattern, which puts the comma in or leaves it out depending on which ICU the
 * server happens to be built against. The date on a printed sign and the date
 * in the published payload have to be the same string.
 */
function guideDateLabel(date: Date): string {
  const parts = GUIDE_DATE_FORMAT.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";

  const weekday = part("weekday");
  const rest = [part("day"), part("month"), part("year")].filter(Boolean).join(" ");
  return weekday ? `${weekday}, ${rest}` : rest;
}

/** Long-form event date for the guide header and printed signs. */
export function formatGuideDate(
  start: Date | string | null | undefined,
  end?: Date | string | null
): string | null {
  if (!start) return null;
  const startDate = start instanceof Date ? start : new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;

  const startLabel = guideDateLabel(startDate);

  if (!end) return startLabel;
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;
  if (endDate.toISOString().slice(0, 10) === startDate.toISOString().slice(0, 10)) {
    return startLabel;
  }
  return `${startLabel} – ${guideDateLabel(endDate)}`;
}
