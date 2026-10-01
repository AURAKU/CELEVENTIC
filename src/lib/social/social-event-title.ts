import { truncateForShare } from "@/lib/social/share-description";
import { sanitizeSocialGuestDisplayName } from "@/lib/social/social-guest";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { isGenericFuneralTitle } from "@/lib/invite-blueprints/funeral-invitation-copy";
import { socialFallbackTitle } from "@/lib/social/social-copy";
import type { SocialEventKind } from "@/lib/social/social-category";

const MAX_SOCIAL_TITLE_LENGTH = 72;
const EXTRA_INTERNAL_PHRASES = [
  "aurelia",
  "seraphine",
  "seraphine champagne",
  "femmora",
  "femmora flagship",
  "forever afaris",
  "classic gold",
  "luxury rings",
];

type CatalogIdentity = {
  slugs: Set<string>;
  phrases: Set<string>;
  names: string[];
};

let cachedIdentity: CatalogIdentity | null = null;

function catalogIdentity(): CatalogIdentity {
  if (cachedIdentity) return cachedIdentity;
  const slugs = new Set<string>();
  const phrases = new Set<string>(EXTRA_INTERNAL_PHRASES);
  const names: string[] = [];
  for (const template of CATALOG_TEMPLATES) {
    slugs.add(template.slug);
    slugs.add(template.layoutSlug);
    if (template.blueprintId) slugs.add(template.blueprintId);
    if (template.themeId) slugs.add(template.themeId);
    names.push(template.name, template.slug.replace(/-/g, " "), template.layoutSlug.replace(/-/g, " "));
    phrases.add(normalizeSocialTitleKey(template.name));
    phrases.add(normalizeSocialTitleKey(template.slug.replace(/-/g, " ")));
    phrases.add(normalizeSocialTitleKey(template.layoutSlug.replace(/-/g, " ")));
    if (template.blueprintId) phrases.add(normalizeSocialTitleKey(template.blueprintId.replace(/-/g, " ")));
    if (template.themeId) phrases.add(normalizeSocialTitleKey(template.themeId.replace(/-/g, " ")));
  }
  cachedIdentity = { slugs, phrases, names };
  return cachedIdentity;
}

export type SocialEventTitleSource = "event" | "host" | "invitation" | "couple" | "honoree" | "fallback";

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
  let current = value.trim();
  const identity = catalogIdentity();
  for (const name of identity.names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    current = current.replace(new RegExp(`\\s+${escaped}$`, "i"), "").trim();
  }
  current = current
    .replace(
      /\s+(?:the\s+)?(?:aurelia|seraphine|femmora)(?:\s+(?:editorial|champagne|flagship))?(?:\s+wedding)?$/i,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  return current;
}

export function isInternalTemplateTitle(value?: string | null): boolean {
  const raw = value?.trim() ?? "";
  if (!raw) return true;
  const identity = catalogIdentity();
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (identity.slugs.has(slug)) return true;
  const key = normalizeSocialTitleKey(raw);
  if (!key) return true;
  const compact = key
    .replace(/\b(invitation|template|layout|sku|catalogue|catalog|experience|preset|blueprint|theme)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return identity.phrases.has(key) || identity.phrases.has(compact);
}

export function sanitizeGuestFacingTitle(value?: string | null): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const stripped = stripTrailingTemplateTokens(raw);
  if (!stripped || isInternalTemplateTitle(stripped) || isInternalTemplateTitle(raw)) {
    return null;
  }
  if (isGenericFuneralTitle(stripped) || isGenericFuneralTitle(raw)) {
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
  deceasedName?: string | null;
  fallback?: string | null;
  kind?: SocialEventKind;
}): SocialEventTitleResult {
  const honoree = { value: sanitizeGuestFacingTitle(input.deceasedName), source: "honoree" as const };
  const standard: Array<{ value: string | null; source: SocialEventTitleSource }> = [
    { value: sanitizeGuestFacingTitle(input.eventTitle), source: "event" },
    { value: sanitizeGuestFacingTitle(input.hostName), source: "host" },
    { value: sanitizeGuestFacingTitle(input.invitationName), source: "invitation" },
    { value: coupleTitleFromNames(input.partnerOneName, input.partnerTwoName), source: "couple" },
  ];
  const candidates =
    input.kind === "funeral" ? [honoree, ...standard] : [...standard, honoree];

  for (const candidate of candidates) {
    if (candidate.value) {
      return { title: truncateSocialTitle(candidate.value), source: candidate.source };
    }
  }

  const fallback =
    sanitizeGuestFacingTitle(input.fallback) ||
    socialFallbackTitle(input.kind ?? "private");
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
  guestDisplayName?: string | null;
  kind?: SocialEventKind;
}): string {
  const title = input.title.trim();
  const dated = input.descriptionDate?.trim();
  const guest = sanitizeSocialGuestDisplayName(input.guestDisplayName);
  const honour = input.kind === "funeral";
  const verb = honour ? "honour" : "celebrate";

  if (guest && dated) {
    return truncateForShare(`Dear ${guest}, you're invited to ${verb} ${title} on ${dated}.`);
  }
  if (guest) {
    return truncateForShare(`Dear ${guest}, you're invited to ${title}.`);
  }
  if (dated) {
    return truncateForShare(`You're invited to ${verb} ${title} on ${dated}.`);
  }
  if (honour) {
    return truncateForShare(`Please join us as we honour and remember ${title}.`);
  }
  return truncateForShare(`You're invited to ${title}.`);
}

export function buildSocialInviteShareTitle(title: string): string {
  return `${title} · You're invited`;
}

export function buildSocialInviteShareText(title: string, guestDisplayName?: string | null): string {
  const guest = sanitizeSocialGuestDisplayName(guestDisplayName);
  if (guest) return `Dear ${guest}, you're invited to ${title}.`;
  return `You're invited to ${title}.`;
}
