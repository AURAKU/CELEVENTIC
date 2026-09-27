import { createHash } from "crypto";
import {
  AURELIA_CATALOG_SLUG,
  isAureliaEditorialLayout,
  SERAPHINE_CATALOG_SLUG,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import {
  buildSocialInviteDescription,
  buildSocialInviteShareTitle,
  formatSocialDateCardLabel,
  formatSocialDescriptionDate,
  resolveSocialEventTitle,
} from "@/lib/social/social-event-title";
import { formatSocialGuestGreeting, sanitizeSocialGuestDisplayName } from "@/lib/social/social-guest";

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
export const SOCIAL_PLACE_CARD_KICKER = "YOU'RE INVITED";
export const SOCIAL_PLACE_CARD_PRIVATE_KICKER = "PRIVATE INVITATION";

export type SocialPlaceCardVariant = "aurelia" | "seraphine";

export function resolveSocialPlaceCardVariant(input: {
  catalogSlug?: string | null;
  layoutSlug?: string | null;
}): SocialPlaceCardVariant | null {
  const slug = input.catalogSlug?.trim() || "";
  const layout = input.layoutSlug?.trim() || "";
  if (layout === SERAPHINE_LAYOUT_SLUG || slug === SERAPHINE_CATALOG_SLUG) return "seraphine";
  if (isAureliaEditorialLayout(layout) || slug === AURELIA_CATALOG_SLUG) return "aurelia";
  return null;
}

export function isSocialPlaceCardUnavailable(input: {
  invitationStatus?: string | null;
  eventStatus?: string | null;
}): boolean {
  return input.invitationStatus === "EXPIRED" || input.eventStatus === "CANCELLED";
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

export function buildAureliaFamilyShareSurface(input: {
  appUrl: string;
  uniqueLink: string;
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  eventTitle?: string | null;
  hostName?: string | null;
  invitationName?: string | null;
  partnerOneName?: string | null;
  partnerTwoName?: string | null;
  dateDisplay?: string | null;
  weekday?: string | null;
  guestDisplayName?: string | null;
  guestToken?: string | null;
  includeGuestInCanonicalUrl?: boolean;
  versionParts: Array<string | number | null | undefined>;
}) {
  const variant = resolveSocialPlaceCardVariant(input);
  const resolved = resolveSocialEventTitle({
    eventTitle: input.eventTitle,
    hostName: input.hostName,
    invitationName: input.invitationName,
    partnerOneName: input.partnerOneName,
    partnerTwoName: input.partnerTwoName,
  });
  const guestDisplayName = sanitizeSocialGuestDisplayName(input.guestDisplayName);
  const guestToken = guestDisplayName ? input.guestToken?.trim() || null : null;
  const guestGreeting = formatSocialGuestGreeting(guestDisplayName);
  const dateLabel = formatSocialDateCardLabel(input.dateDisplay);
  const descriptionDate = formatSocialDescriptionDate({
    dateLabel: input.dateDisplay,
    weekday: input.weekday,
  });
  const version = buildSocialPlaceCardVersion([
    ...input.versionParts,
    resolved.title,
    input.dateDisplay,
    variant,
    guestToken,
    guestDisplayName,
  ]);
  const image = decorateSocialPlaceCardImage(input.appUrl, input.uniqueLink, version, guestToken);
  const canonicalUrl = buildInviteCanonicalUrl(
    input.appUrl,
    input.uniqueLink,
    input.includeGuestInCanonicalUrl === false ? null : guestToken
  );
  return {
    variant,
    title: resolved.title,
    shareTitle: buildSocialInviteShareTitle(resolved.title),
    description: buildSocialInviteDescription({
      title: resolved.title,
      hostName: input.hostName,
      descriptionDate,
      guestDisplayName,
    }),
    dateLabel,
    image,
    canonicalUrl,
    imageAlt: resolved.title,
    phrase: guestGreeting ? SOCIAL_PLACE_CARD_PERSONAL_PHRASE : SOCIAL_PLACE_CARD_PHRASE,
    kicker: guestGreeting ? SOCIAL_PLACE_CARD_PRIVATE_KICKER : SOCIAL_PLACE_CARD_KICKER,
    guestGreeting,
    guestDisplayName,
    guestToken,
    source: resolved.source,
  };
}
