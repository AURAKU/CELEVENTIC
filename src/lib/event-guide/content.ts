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

const MAX_PROGRAMME_ITEMS = 60;
const MAX_MENU_SECTIONS = 20;
const MAX_ATTACHMENTS = 6;
const MAX_TEXT = 400;
const MAX_MENU_BODY = 8000;

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
  if (!Array.isArray(raw)) return [];
  const items: GuideProgrammeItem[] = [];
  for (const entry of raw.slice(0, MAX_PROGRAMME_ITEMS)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const title = text(row.title, 160);
    if (!title) continue;
    const description = text(row.description ?? row.detail, MAX_TEXT);
    items.push({
      id: text(row.id, 64) || `prog-${items.length + 1}-${slugFragment(title)}`,
      time: text(row.time, 40),
      title,
      ...(description ? { description } : {}),
    });
  }
  return items;
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
  menu: GuideMenu;
  attachments: GuideAttachment[];
  programmeSource: "guide" | "invitation" | "empty";
  menuSource: "guide" | "invitation" | "empty";
} {
  const guideProgramme = normalizeProgrammeItems(input.programmeDraft);
  const invitationProgramme = programmeItemsFromWeddingBoard(input.invitationProgrammeItems);
  const programme = guideProgramme.length > 0 ? guideProgramme : invitationProgramme;

  const guideMenu = normalizeMenu(input.menuDraft);
  const invitationMenu = normalizeMenu(readCompanionMenuConfig(input.invitationFeatureConfig));
  const menu = menuHasContent(guideMenu) ? guideMenu : invitationMenu;

  return {
    programme,
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

/** Long-form event date for the guide header and printed signs. */
export function formatGuideDate(
  start: Date | string | null | undefined,
  end?: Date | string | null
): string | null {
  if (!start) return null;
  const startDate = start instanceof Date ? start : new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;

  const fmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const startLabel = fmt.format(startDate);

  if (!end) return startLabel;
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;
  if (endDate.toISOString().slice(0, 10) === startDate.toISOString().slice(0, 10)) {
    return startLabel;
  }
  return `${startLabel} – ${fmt.format(endDate)}`;
}
