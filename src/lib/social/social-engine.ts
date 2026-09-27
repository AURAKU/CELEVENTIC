import { createHash } from "crypto";
import { truncateForShare } from "@/lib/social/share-description";
import { sanitizeSocialGuestDisplayName, formatSocialGuestGreeting } from "@/lib/social/social-guest";
import { resolveSocialEventKind, type SocialEventKind } from "@/lib/social/social-category";
import {
  socialCardPhrase,
  socialCopyForKind,
  socialFallbackTitle,
  socialNativeShareText,
  socialShareTitle,
  SOCIAL_PLACE_CARD_KICKER,
  SOCIAL_PLACE_CARD_PRIVATE_KICKER,
} from "@/lib/social/social-copy";
import { resolveSocialVisualTheme, type SocialVisualTheme } from "@/lib/social/social-theme";
import { resolveSocialHeroImage } from "@/lib/social/social-hero";
import {
  resolveSocialEventTitle,
  formatSocialDateCardLabel,
  formatSocialDescriptionDate,
  sanitizeGuestFacingTitle,
} from "@/lib/social/social-event-title";
import type { LuxuryFashionHouseConfig } from "@/lib/experience/luxury-fashion";

export type SocialPlaceCardImage = {
  url: string;
  width: number;
  height: number;
  type: string;
};

export const SOCIAL_PLACE_CARD_WIDTH = 1200;
export const SOCIAL_PLACE_CARD_HEIGHT = 630;
export const SOCIAL_PLACE_CARD_TYPE = "image/png";
export const SOCIAL_PLACE_CARD_PHRASE = "Join us for this special celebration.";
export const SOCIAL_PLACE_CARD_PERSONAL_PHRASE = "invite you to celebrate with them";

export type SocialPlaceCardVariant = "aurelia" | "seraphine" | "platform";

export function isSocialPlaceCardUnavailable(input: {
  invitationStatus?: string | null;
  eventStatus?: string | null;
}): boolean {
  return input.invitationStatus === "EXPIRED" || input.eventStatus === "CANCELLED" || input.invitationStatus === "DRAFT";
}

export function buildSocialPlaceCardVersion(parts: Array<string | number | null | undefined>): string {
  const raw = parts
    .map((part) => (part == null ? "" : String(part)))
    .join("|");
  return createHash("sha1").update(raw).digest("hex").slice(0, 12);
}

export function buildSocialPlaceCardPath(
  uniqueLink: string,
  version: string,
  guestToken?: string | null
): string {
  const link = uniqueLink.trim();
  const params = new URLSearchParams();
  const guest = guestToken?.trim();
  if (guest) params.set("guest", guest);
  params.set("v", version);
  return `/api/social/invite/${encodeURIComponent(link)}/image?${params.toString()}`;
}

export function decorateSocialPlaceCardImage(
  appUrl: string,
  uniqueLink: string,
  version: string,
  guestToken?: string | null
): SocialPlaceCardImage {
  const path = buildSocialPlaceCardPath(uniqueLink, version, guestToken);
  const base = appUrl.replace(/\/$/, "");
  return {
    url: `${base}${path}`,
    width: SOCIAL_PLACE_CARD_WIDTH,
    height: SOCIAL_PLACE_CARD_HEIGHT,
    type: SOCIAL_PLACE_CARD_TYPE,
  };
}

export function buildInviteCanonicalUrl(
  appUrl: string,
  uniqueLink: string,
  guestToken?: string | null
): string {
  const base = `${appUrl.replace(/\/$/, "")}/invite/${encodeURIComponent(uniqueLink.trim())}`;
  const guest = guestToken?.trim();
  return guest ? `${base}?guest=${encodeURIComponent(guest)}` : base;
}

/** @deprecated Use buildSocialInvitationSurface — kept for existing Aurelia tests. */
export function resolveSocialPlaceCardVariant(input: {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
}): SocialPlaceCardVariant | null {
  const kind = resolveSocialEventKind(input);
  const slug = `${input.catalogSlug ?? ""} ${input.layoutSlug ?? ""}`.toLowerCase();
  if (slug.includes("seraphine")) return "seraphine";
  if (slug.includes("aurelia")) return "aurelia";
  return kind ? "platform" : "platform";
}

export type SocialInvitationInput = {
  appUrl: string;
  uniqueLink: string;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  catalogCategory?: string | null;
  eventType?: string | null;
  eventTitle?: string | null;
  hostName?: string | null;
  invitationName?: string | null;
  partnerOneName?: string | null;
  partnerTwoName?: string | null;
  deceasedName?: string | null;
  dateDisplay?: string | null;
  eventStartDate?: string | Date | null;
  weekday?: string | null;
  guestDisplayName?: string | null;
  guestToken?: string | null;
  includeGuestInCanonicalUrl?: boolean;
  colors?: {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
    background?: string | null;
  } | null;
  shareOgImageUrl?: string | null;
  fashionHouse?: Partial<LuxuryFashionHouseConfig> | null;
  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  mediaHeroUrl?: string | null;
  versionParts: Array<string | number | null | undefined>;
};

export type SocialInvitationSurface = {
  kind: SocialEventKind;
  variant: SocialPlaceCardVariant;
  title: string;
  shareTitle: string;
  shareText: string;
  description: string;
  dateLabel: string | null;
  image: SocialPlaceCardImage;
  canonicalUrl: string;
  imageAlt: string;
  phrase: string;
  kicker: string;
  guestGreeting: string | null;
  guestDisplayName: string | null;
  guestToken: string | null;
  source: string;
  theme: SocialVisualTheme;
  heroUrl: string | null;
  unavailablePhrase: string;
};

function formatDateFromInstant(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return date
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Accra",
      })
      .toUpperCase();
  } catch {
    return null;
  }
}

export function buildSocialInvitationSurface(input: SocialInvitationInput): SocialInvitationSurface {
  const kind = resolveSocialEventKind({
    catalogSlug: input.catalogSlug,
    layoutSlug: input.layoutSlug,
    catalogCategory: input.catalogCategory,
    eventType: input.eventType,
  });
  const copy = socialCopyForKind(kind);
  const resolved = resolveSocialEventTitle({
    eventTitle: input.eventTitle,
    hostName: input.hostName,
    invitationName: input.invitationName,
    partnerOneName: input.partnerOneName,
    partnerTwoName: input.partnerTwoName,
    deceasedName: input.deceasedName,
    fallback: socialFallbackTitle(kind),
    kind,
  });
  const guestDisplayName = sanitizeSocialGuestDisplayName(input.guestDisplayName);
  const guestToken = guestDisplayName ? input.guestToken?.trim() || null : null;
  const guestGreeting = formatSocialGuestGreeting(guestDisplayName);
  const dateLabel =
    formatSocialDateCardLabel(input.dateDisplay) || formatDateFromInstant(input.eventStartDate);
  const descriptionDate = formatSocialDescriptionDate({
    dateLabel: input.dateDisplay,
    weekday: input.weekday,
  });
  const host = sanitizeGuestFacingTitle(input.hostName);
  const description = truncateForShare(
    guestDisplayName
      ? copy.personalDescription(resolved.title, host, guestDisplayName)
      : kind === "wedding" && descriptionDate && !guestDisplayName
        ? `You're invited to celebrate ${resolved.title} on ${descriptionDate}.`
        : copy.description(resolved.title, host)
  );
  const theme = resolveSocialVisualTheme({
    kind,
    catalogSlug: input.catalogSlug,
    layoutSlug: input.layoutSlug,
    colors: input.colors,
  });
  const hero = resolveSocialHeroImage({
    catalogSlug: input.catalogSlug,
    layoutSlug: input.layoutSlug,
    shareOgImageUrl: input.shareOgImageUrl,
    fashionHouse: input.fashionHouse,
    heroImageUrl: input.heroImageUrl,
    coverImageUrl: input.coverImageUrl,
    mediaHeroUrl: input.mediaHeroUrl,
  });
  const variant = resolveSocialPlaceCardVariant(input);
  const version = buildSocialPlaceCardVersion([
    ...input.versionParts,
    resolved.title,
    input.dateDisplay,
    dateLabel,
    kind,
    guestToken,
    guestDisplayName,
    hero.url,
    theme.panel,
  ]);
  const image = decorateSocialPlaceCardImage(input.appUrl, input.uniqueLink, version, guestToken);
  return {
    kind,
    variant: variant ?? "platform",
    title: resolved.title,
    shareTitle: socialShareTitle(resolved.title, kind),
    shareText: socialNativeShareText({
      kind,
      title: resolved.title,
      guestDisplayName,
    }),
    description,
    dateLabel,
    image,
    canonicalUrl: buildInviteCanonicalUrl(
      input.appUrl,
      input.uniqueLink,
      input.includeGuestInCanonicalUrl === false ? null : guestToken
    ),
    imageAlt: resolved.title,
    phrase: socialCardPhrase(kind, Boolean(guestGreeting)),
    kicker: guestGreeting ? SOCIAL_PLACE_CARD_PRIVATE_KICKER : SOCIAL_PLACE_CARD_KICKER,
    guestGreeting,
    guestDisplayName,
    guestToken,
    source: resolved.source,
    theme,
    heroUrl: hero.url,
    unavailablePhrase: copy.unavailablePhrase,
  };
}

/** @deprecated Prefer buildSocialInvitationSurface */
export function buildAureliaFamilyShareSurface(input: SocialInvitationInput) {
  return buildSocialInvitationSurface(input);
}
