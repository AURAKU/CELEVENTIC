/**
 * Reusable invitation social-links — platform-agnostic DNA for any template.
 * Luxury fashion (and later families) supply configured links; nothing here is Femmora-specific.
 */

export const INVITATION_SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "facebook",
  "whatsapp",
  "youtube",
  "x",
  "snapchat",
  "pinterest",
] as const;

export type InvitationSocialPlatformId = (typeof INVITATION_SOCIAL_PLATFORMS)[number];

export interface InvitationSocialLink {
  platform: InvitationSocialPlatformId;
  handle?: string;
  url?: string;
  enabled?: boolean;
  ctaLabel?: string;
}

export interface ResolvedInvitationSocialLink {
  platform: InvitationSocialPlatformId;
  handle?: string;
  displayHandle: string;
  url: string | null;
  ctaLabel: string;
}

const PLATFORM_HOSTS: Record<InvitationSocialPlatformId, Set<string> | null> = {
  instagram: new Set(["instagram.com", "www.instagram.com", "instagr.am"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com", "vm.tiktok.com"]),
  facebook: new Set(["facebook.com", "www.facebook.com", "fb.com", "www.fb.com", "m.facebook.com"]),
  whatsapp: new Set(["wa.me", "api.whatsapp.com", "whatsapp.com", "www.whatsapp.com", "chat.whatsapp.com"]),
  youtube: new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]),
  x: new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]),
  snapchat: new Set(["snapchat.com", "www.snapchat.com"]),
  pinterest: new Set(["pinterest.com", "www.pinterest.com", "pin.it"]),
};

const PLATFORM_LABEL: Record<InvitationSocialPlatformId, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  x: "X",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
};

export function normalizeSocialHandle(handle?: string | null): string {
  return (handle ?? "").trim().replace(/^@+/, "");
}

export function displaySocialHandle(handle?: string | null): string {
  const normalized = normalizeSocialHandle(handle);
  return normalized ? `@${normalized}` : "";
}

export function socialPlatformLabel(platform: InvitationSocialPlatformId): string {
  return PLATFORM_LABEL[platform];
}

export function defaultSocialCta(platform: InvitationSocialPlatformId, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  if (platform === "whatsapp") return "Message on WhatsApp";
  return `Follow on ${PLATFORM_LABEL[platform]}`;
}

export function followAriaLabel(houseName: string | undefined, platform: InvitationSocialPlatformId): string {
  const name = houseName?.trim() || "the house";
  return `Follow ${name} on ${PLATFORM_LABEL[platform]}`;
}

function coerceHttpsHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value)) return `https://${value}`;
  return value;
}

export function safeSocialHttpUrl(
  raw?: string | null,
  platform?: InvitationSocialPlatformId
): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(coerceHttpsHref(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const allowed = platform ? PLATFORM_HOSTS[platform] : null;
    if (allowed && !allowed.has(url.hostname.toLowerCase())) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

export function resolveInvitationSocialLinks(
  links?: InvitationSocialLink[] | null
): ResolvedInvitationSocialLink[] {
  return (links ?? [])
    .filter((link) => link.enabled !== false)
    .map((link) => {
      const handle = normalizeSocialHandle(link.handle) || undefined;
      const url = safeSocialHttpUrl(link.url, link.platform);
      if (!handle && !url) return null;
      return {
        platform: link.platform,
        handle,
        displayHandle: displaySocialHandle(handle),
        url,
        ctaLabel: defaultSocialCta(link.platform, link.ctaLabel),
      } satisfies ResolvedInvitationSocialLink;
    })
    .filter((link): link is ResolvedInvitationSocialLink => Boolean(link));
}

export function socialLinkHasDestination(link: ResolvedInvitationSocialLink): boolean {
  return Boolean(link.url);
}
