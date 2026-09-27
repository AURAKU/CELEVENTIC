import { truncateForShare } from "@/lib/social/share-description";
import {
  AURELIA_CATALOG_SLUG,
  AURELIA_LAYOUT_SLUG,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";

const MAX_SOCIAL_TITLE_LENGTH = 72;
const NEUTRAL_WEDDING_FALLBACK = "Wedding Celebration";

/** Product / catalogue identifiers that must never appear as the event brand. */
const INTERNAL_TITLE_PHRASES = [
  "aurelia editorial wedding",
  "seraphine champagne wedding",
  "aurelia editorial",
  "seraphine champagne",
  "aurelia",
  "seraphine",
  AURELIA_CATALOG_SLUG.replace(/-/g, " "),
  SERAPHINE_CATALOG_SLUG.replace(/-/g, " "),
  AURELIA_LAYOUT_SLUG.replace(/-/g, " "),
  SERAPHINE_LAYOUT_SLUG.replace(/-/g, " "),
] as const;

const INTERNAL_SLUGS = new Set([
  AURELIA_CATALOG_SLUG,
  AURELIA_LAYOUT_SLUG,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_LAYOUT_SLUG,
]);

export type SocialEventTitleSource = "event" | "host" | "invitation" | "couple" | "fallback";

export type SocialEventTitleResult = {
  title: string;
  source: SocialEventTitleSource;
};

export function normalizeSocialTitleKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripTrailingTemplateTokens(value: string): string {
  return value
    .replace(
      /\s+(?:the\s+)?(?:aurelia|seraphine)(?:\s+(?:editorial|champagne))?(?:\s+wedding)?$/i,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isInternalTemplateTitle(value?: string | null): boolean {
  const raw = value?.trim() ?? "";
  if (!raw) return true;
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (INTERNAL_SLUGS.has(slug)) return true;
  const key = normalizeSocialTitleKey(raw);
  if (!key) return true;
  const compact = key
    .replace(/\b(invitation|template|layout|sku|catalogue|catalog|experience|preset)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return INTERNAL_TITLE_PHRASES.some((phrase) => key === phrase || compact === phrase);
}

export function sanitizeGuestFacingTitle(value?: string | null): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const stripped = stripTrailingTemplateTokens(raw);
  if (!stripped || isInternalTemplateTitle(stripped) || isInternalTemplateTitle(raw)) {
    return null;
  }
  return stripped;
}

export function truncateSocialTitle(value: string, maxLength = MAX_SOCIAL_TITLE_LENGTH): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  const sliced = trimmed.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > maxLength * 0.45 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe.trimEnd()}…`;
}

export function coupleTitleFromNames(
  partnerOne?: string | null,
  partnerTwo?: string | null
): string | null {
  const one = partnerOne?.trim();
  const two = partnerTwo?.trim();
  if (one && two) {
    const joined = `${one} & ${two}`;
    return isInternalTemplateTitle(joined) ? null : joined;
  }
  if (one && !isInternalTemplateTitle(one)) return one;
  if (two && !isInternalTemplateTitle(two)) return two;
  return null;
}

/**
 * Guest-facing event brand for Open Graph, Twitter, and native share sheets.
 * Never returns Aurelia/Seraphine product, layout, or catalogue identifiers.
 */
export function resolveSocialEventTitle(input: {
  eventTitle?: string | null;
  hostName?: string | null;
  invitationName?: string | null;
  partnerOneName?: string | null;
  partnerTwoName?: string | null;
  fallback?: string | null;
}): SocialEventTitleResult {
  const candidates: Array<{ value: string | null; source: SocialEventTitleSource }> = [
    { value: sanitizeGuestFacingTitle(input.eventTitle), source: "event" },
    { value: sanitizeGuestFacingTitle(input.hostName), source: "host" },
    { value: sanitizeGuestFacingTitle(input.invitationName), source: "invitation" },
    { value: coupleTitleFromNames(input.partnerOneName, input.partnerTwoName), source: "couple" },
  ];

  for (const candidate of candidates) {
    if (candidate.value) {
      return { title: truncateSocialTitle(candidate.value), source: candidate.source };
    }
  }

  const fallback = sanitizeGuestFacingTitle(input.fallback) || NEUTRAL_WEDDING_FALLBACK;
  return { title: truncateSocialTitle(fallback), source: "fallback" };
}

export function isSpecificCalendarDate(label?: string | null): boolean {
  const value = label?.trim() ?? "";
  if (!value) return false;
  return (
    /\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/.test(value) ||
    /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(value)
  );
}

export function formatSocialDateCardLabel(label?: string | null): string | null {
  const value = label?.trim();
  if (!value || isInternalTemplateTitle(value)) return null;
  return value.replace(/\s+/g, " ").toUpperCase();
}

export function formatSocialDescriptionDate(input: {
  dateLabel?: string | null;
  weekday?: string | null;
}): string | null {
  const dateLabel = input.dateLabel?.trim();
  if (!dateLabel || !isSpecificCalendarDate(dateLabel)) return null;
  const weekday = input.weekday?.trim();
  if (weekday) return `${weekday}, ${dateLabel}`;
  return dateLabel;
}

export function resolveCeremonyWeekdayForDate(input: {
  dateDisplay?: string | null;
  ceremonies?: Array<{ weekday?: string | null; dateLabel?: string | null }> | null;
}): string | null {
  const dateDisplay = input.dateDisplay?.trim();
  if (!dateDisplay || !isSpecificCalendarDate(dateDisplay)) return null;
  const dateKey = normalizeSocialTitleKey(dateDisplay);
  const ceremonies = input.ceremonies ?? [];
  const match = ceremonies.find(
    (ceremony) => normalizeSocialTitleKey(ceremony.dateLabel ?? "") === dateKey
  );
  const weekday = match?.weekday?.trim() || ceremonies.at(-1)?.weekday?.trim() || "";
  return weekday || null;
}

export function buildSocialInviteDescription(input: {
  title: string;
  hostName?: string | null;
  descriptionDate?: string | null;
}): string {
  const title = input.title.trim();
  const host = sanitizeGuestFacingTitle(input.hostName);
  const dated = input.descriptionDate?.trim();

  if (dated) {
    return truncateForShare(`You're invited to celebrate ${title} on ${dated}.`);
  }
  if (host) {
    const verb = host.includes("&") ? "invite" : "invites";
    return truncateForShare(
      `${host} ${verb} you to celebrate with them — tap to open your invitation.`
    );
  }
  return truncateForShare(`You're invited to ${title}. Tap to open your invitation.`);
}

export function buildSocialInviteShareTitle(title: string): string {
  return `${title} · You're invited`;
}

export function buildSocialInviteShareText(title: string): string {
  return `You're invited to ${title}.`;
}
