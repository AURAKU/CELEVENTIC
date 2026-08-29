import type { LuxuryFashionHouseConfig } from "./types";
import {
  defaultSocialCta,
  resolveInvitationSocialLinks,
  type InvitationSocialLink,
  type ResolvedInvitationSocialLink,
} from "@/lib/invitation/social-links";

export {
  displaySocialHandle as displayFashionSocialHandle,
  followAriaLabel,
  normalizeSocialHandle as normalizeFashionSocialHandle,
  resolveInvitationSocialLinks,
  safeSocialHttpUrl,
  socialLinkHasDestination,
} from "@/lib/invitation/social-links";

export type { InvitationSocialLink, ResolvedInvitationSocialLink };

/** Prefer Studio socialLinks[]; keep legacy handle/url fields as a fallback. */
export function houseSocialLinkSource(house: LuxuryFashionHouseConfig): InvitationSocialLink[] {
  if (house.socialLinks?.length) return house.socialLinks;
  const links: InvitationSocialLink[] = [];
  const instagramHandle = house.instagramHandle?.trim();
  const instagramUrl = house.instagramUrl?.trim();
  if (instagramHandle || instagramUrl) {
    links.push({
      platform: "instagram",
      handle: instagramHandle,
      url: instagramUrl,
      enabled: true,
      ctaLabel: house.socialCtaLabel,
    });
  }
  const tiktokHandle = house.tiktokHandle?.trim();
  const tiktokUrl = house.tiktokUrl?.trim();
  if (tiktokHandle || tiktokUrl) {
    links.push({
      platform: "tiktok",
      handle: tiktokHandle,
      url: tiktokUrl,
      enabled: true,
    });
  }
  return links;
}

export function resolveFashionSocialLinks(house: LuxuryFashionHouseConfig): ResolvedInvitationSocialLink[] {
  return resolveInvitationSocialLinks(houseSocialLinkSource(house)).map((link) =>
    link.platform === "instagram"
      ? { ...link, ctaLabel: defaultSocialCta("instagram", house.socialCtaLabel || link.ctaLabel) }
      : link
  );
}

export function resolveFashionSocialTitle(house: LuxuryFashionHouseConfig): string {
  if (house.socialTitle?.trim()) return house.socialTitle.trim();
  if (house.houseName?.trim()) return `Follow ${house.houseName.trim()}`;
  return "Stay Connected";
}
