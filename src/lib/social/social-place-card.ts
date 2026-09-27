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

export type SocialPlaceCardImage = {
  url: string;
  width: number;
  height: number;
  type: string;
};

export const SOCIAL_PLACE_CARD_WIDTH = 1200;
export const SOCIAL_PLACE_CARD_HEIGHT = 630;
export const SOCIAL_PLACE_CARD_TYPE = "image/png";
export const SOCIAL_PLACE_CARD_PHRASE = "You're invited to celebrate with us.";

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

export function buildSocialPlaceCardPath(uniqueLink: string, version: string): string {
  const link = uniqueLink.trim();
  const params = new URLSearchParams({ v: version });
  return `/api/social/invite/${encodeURIComponent(link)}/image?${params.toString()}`;
}

export function decorateSocialPlaceCardImage(
  appUrl: string,
  uniqueLink: string,
  version: string
): SocialPlaceCardImage {
  const path = buildSocialPlaceCardPath(uniqueLink, version);
  const base = appUrl.replace(/\/$/, "");
  return {
    url: `${base}${path}`,
    width: SOCIAL_PLACE_CARD_WIDTH,
    height: SOCIAL_PLACE_CARD_HEIGHT,
    type: SOCIAL_PLACE_CARD_TYPE,
  };
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
  ]);
  const image = decorateSocialPlaceCardImage(input.appUrl, input.uniqueLink, version);
  const canonicalUrl = `${input.appUrl.replace(/\/$/, "")}/invite/${encodeURIComponent(input.uniqueLink.trim())}`;
  return {
    variant,
    title: resolved.title,
    shareTitle: buildSocialInviteShareTitle(resolved.title),
    description: buildSocialInviteDescription({
      title: resolved.title,
      hostName: input.hostName,
      descriptionDate,
    }),
    dateLabel,
    image,
    canonicalUrl,
    imageAlt: resolved.title,
    phrase: SOCIAL_PLACE_CARD_PHRASE,
    source: resolved.source,
  };
}
