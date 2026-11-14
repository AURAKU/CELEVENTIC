import { z } from "zod";
import { compactCeleCardDesign, type CeleCardDesign } from "@/lib/digital-business-card/design";
import { celeCardPlaceHref, parseCeleCardPlace } from "@/lib/digital-business-card/maps";
import { otherLinkHref, otherLinkHost, parseOtherLink } from "@/lib/digital-business-card/other-links";
import { compactMeetingDesk, meetingSubtitle, persistMeetingDesk } from "@/lib/digital-business-card/meetings";
import { persistBusinessProfile } from "@/lib/digital-business-card/business-profile";
import { callingCodeFromPhones, displayPhone, internationalTelHref } from "@/lib/digital-business-card/phone-format";

export const DIGITAL_CARD_SOCIAL_ICON_IDS = [
  "linkedin",
  "instagram",
  "github",
  "globe",
  "phone",
  "facebook",
  "youtube",
  "twitter",
  "send",
  "message",
  "messages",
  "music",
  "video",
  "at",
  "camera",
  "play",
  "tv",
  "gamepad",
  "headphones",
  "hash",
] as const;

export type DigitalCardSocialIconId = (typeof DIGITAL_CARD_SOCIAL_ICON_IDS)[number];
export type DigitalCardSocialGroup = "chat" | "social" | "create" | "pay";

type DigitalCardSocialNetworkBase = {
  key: string;
  label: string;
  group: DigitalCardSocialGroup;
  icon: DigitalCardSocialIconId;
  placeholder: string;
  /** Build a tap URL from a username, number, or pasted link. */
  href: (value: string) => string;
  /** Guest can scan an uploaded receive QR for this wallet. */
  acceptsQr?: boolean;
};

function handle(value: string) {
  return value.trim().replace(/^@/, "");
}

const TRACKING_QUERY = /^(utm_|igsh|igshid|fbclid|gclid|mc_|ref$|ref_|share_id|share_app|si$|feature$|rdid|tt_from|is_from_webapp|_r$|_t$|e$)/i;

const KNOWN_SHARE_HOSTS = new Set([
  "instagram.com",
  "instagr.am",
  "l.instagram.com",
  "tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "x.com",
  "twitter.com",
  "mobile.twitter.com",
  "threads.net",
  "facebook.com",
  "fb.com",
  "fb.watch",
  "l.facebook.com",
  "lm.facebook.com",
  "linkedin.com",
  "lnkd.in",
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
  "music.youtube.com",
  "snapchat.com",
  "pinterest.com",
  "pin.it",
  "reddit.com",
  "discord.com",
  "discord.gg",
  "bsky.app",
  "trendshub.live",
  "t.me",
  "telegram.me",
  "telegram.dog",
  "m.me",
  "wa.me",
  "api.whatsapp.com",
  "chat.whatsapp.com",
  "web.whatsapp.com",
  "whatsapp.com",
  "github.com",
  "twitch.tv",
  "open.spotify.com",
  "spotify.com",
  "music.apple.com",
  "behance.net",
  "dribbble.com",
  "medium.com",
  "signal.me",
  "line.me",
  "viber.com",
  "u.wechat.com",
  "paypal.me",
  "paypal.com",
  "cash.app",
  "venmo.com",
  "revolut.me",
  "wise.com",
  "chippercash.com",
  "qr.alipay.com",
]);

const WWW_SHARE_HOSTS = new Set([
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "linkedin.com",
  "youtube.com",
  "threads.net",
  "pinterest.com",
  "snapchat.com",
  "whatsapp.com",
]);

const CONTENT_PATH_SEGMENTS: Record<string, Set<string>> = {
  instagram: new Set(["p", "reel", "reels", "tv", "stories", "share"]),
  whatsapp: new Set(["channel", "message", "c"]),
  telegram: new Set(["joinchat", "s", "c"]),
  tiktok: new Set(["video", "t", "embed", "photo"]),
  youtube: new Set(["watch", "shorts", "live", "embed", "playlist", "clip"]),
  x: new Set(["status", "i"]),
  threads: new Set(["post"]),
  facebook: new Set(["posts", "videos", "watch", "share", "reel", "reels", "permalink.php", "photo.php", "story.php"]),
  linkedin: new Set(["posts", "feed", "pulse", "events"]),
  pinterest: new Set(["pin"]),
  reddit: new Set(["comments", "gallery"]),
  snapchat: new Set(["t", "spotlight"]),
  discord: new Set(["invite", "channels"]),
  bluesky: new Set(["post"]),
  github: new Set([]),
  spotify: new Set(["track", "album", "playlist", "episode", "show"]),
  medium: new Set(["p"]),
};

const SHORT_CONTENT_HOSTS = new Set([
  "vm.tiktok.com",
  "vt.tiktok.com",
  "youtu.be",
  "fb.watch",
  "lnkd.in",
  "pin.it",
  "instagr.am",
  "chat.whatsapp.com",
]);

export function looksLikeShareUrl(value: string): boolean {
  const t = value.trim();
  if (!t || t.startsWith("@")) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return true;
  const bare = t.replace(/^\/\//, "");
  const match = bare.match(/^((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)([/:?#].*)?$/i);
  if (!match) return false;
  const host = match[1].replace(/^www\./i, "").toLowerCase();
  if (KNOWN_SHARE_HOSTS.has(host)) return true;
  if (/^www\./i.test(match[1])) return true;
  const rest = match[2] || "";
  return rest.startsWith("/") || rest.startsWith("?") || rest.startsWith("#");
}

function parseShareUrl(value: string): URL | null {
  const t = value.trim();
  if (!looksLikeShareUrl(t)) return null;
  if (/^instagram:\/\//i.test(t)) {
    try {
      const app = new URL(t);
      const user = app.searchParams.get("username");
      if (user) return new URL(`https://www.instagram.com/${handle(user)}`);
    } catch {
      return null;
    }
  }
  if (/^whatsapp:\/\//i.test(t)) {
    try {
      const app = new URL(t);
      const phone = app.searchParams.get("phone") || "";
      const text = app.searchParams.get("text") || "";
      if (phone) {
        const next = new URL(`https://wa.me/${digits(phone)}`);
        if (text) next.searchParams.set("text", text);
        return next;
      }
    } catch {
      return null;
    }
  }
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t.replace(/^\/\//, "")}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/i.test(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function unwrapShareUrl(url: URL, depth = 0): URL {
  if (depth > 3) return url;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "l.instagram.com" || host === "l.facebook.com" || host === "lm.facebook.com") {
    const inner = url.searchParams.get("u") || url.searchParams.get("url");
    if (inner) {
      try {
        return unwrapShareUrl(new URL(inner), depth + 1);
      } catch {
        return url;
      }
    }
  }
  return url;
}

function expandShortShareUrl(url: URL): URL {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    if (id) {
      const next = new URL("https://www.youtube.com/watch");
      next.searchParams.set("v", id);
      const t = url.searchParams.get("t") || url.searchParams.get("start");
      if (t) next.searchParams.set("t", t);
      return next;
    }
  }
  if (host === "twitter.com" || host === "mobile.twitter.com") {
    const next = new URL(url.toString());
    next.hostname = "x.com";
    return next;
  }
  if (host === "instagr.am") {
    const next = new URL(url.toString());
    next.hostname = "www.instagram.com";
    return next;
  }
  if (host === "fb.com") {
    const next = new URL(url.toString());
    next.hostname = "www.facebook.com";
    return next;
  }
  return url;
}

function stripTrackingParams(url: URL): URL {
  const next = new URL(url.toString());
  for (const key of [...next.searchParams.keys()]) {
    if (TRACKING_QUERY.test(key)) next.searchParams.delete(key);
  }
  return next;
}

export function canonicalizeShareHref(value: string): string | null {
  const parsed = parseShareUrl(value);
  if (!parsed) return null;
  const next = stripTrackingParams(expandShortShareUrl(unwrapShareUrl(parsed)));
  const host = next.hostname.replace(/^www\./, "").toLowerCase();
  if (WWW_SHARE_HOSTS.has(host)) next.hostname = `www.${host}`;
  else if (host === "x.com") next.hostname = "x.com";
  let href = next.toString();
  if (!next.search && href.endsWith("/") && next.pathname !== "/") href = href.slice(0, -1);
  return href;
}

export function isExactPageShare(brand: string, value: string, href = ""): boolean {
  const url = parseShareUrl(href || value) || parseShareUrl(value);
  if (!url) return false;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (SHORT_CONTENT_HOSTS.has(host) && url.pathname.replace(/\/+$/, "").length > 1) return true;
  const parts = url.pathname.split("/").filter(Boolean).map((part) => part.toLowerCase());
  if (brand === "youtube" && url.searchParams.has("v")) return true;
  if ((brand === "whatsapp" || brand === "whatsappbusiness") && url.searchParams.has("text")) return true;
  if (brand === "telegram" && (url.pathname.startsWith("/+") || parts[0]?.startsWith("+"))) return true;
  if (brand === "github" && parts.length >= 2) return true;
  if (brand === "bluesky" && parts.includes("post")) return true;
  if (brand === "x" && parts.includes("status")) return true;
  const content = CONTENT_PATH_SEGMENTS[brand];
  return Boolean(content && parts.some((part) => content.has(part)));
}

function asUrlOr(value: string, make: (clean: string) => string) {
  const exact = canonicalizeShareHref(value);
  if (exact) return exact;
  const v = value.trim();
  if (!v) return make("");
  return make(handle(v));
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export const CHAT_LINK_KINDS = [
  { id: "number", label: "Number" },
  { id: "username", label: "Username" },
  { id: "group", label: "Group" },
  { id: "channel", label: "Channel" },
] as const;

export type ChatLinkKind = (typeof CHAT_LINK_KINDS)[number]["id"];

export const CHAT_KIND_BRANDS = new Set(["whatsapp", "whatsappbusiness", "telegram"]);

export function usesChatLinkKinds(brand: string): boolean {
  return CHAT_KIND_BRANDS.has(brand);
}

export function normalizeChatLinkKind(raw: unknown): ChatLinkKind | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "number" || value === "username" || value === "group" || value === "channel") return value;
  return null;
}

export function chatLinkKindLabel(kind?: string | null): string | null {
  if (kind === "number") return "Chat";
  const known = CHAT_LINK_KINDS.find((item) => item.id === kind);
  return known?.label ?? null;
}

export function detectChatLinkKind(brand: string, value: string): ChatLinkKind {
  const v = value.trim();
  const href = canonicalizeShareHref(v);
  let host = "";
  let path = "";
  if (href) {
    try {
      const url = new URL(href);
      host = url.hostname.replace(/^www\./, "").toLowerCase();
      path = url.pathname.toLowerCase();
    } catch {
      host = "";
    }
  }
  if (brand === "whatsapp" || brand === "whatsappbusiness") {
    if (host === "chat.whatsapp.com" || /chat\.whatsapp\.com/i.test(v)) return "group";
    if (path.includes("/channel/") || /whatsapp\.com\/channel\//i.test(v)) return "channel";
    if (path.includes("/message/") || /wa\.me\/message\//i.test(v)) return "username";
    if (digits(v).length >= 7) return "number";
    if (href) return "username";
    return /[a-z]/i.test(v) ? "username" : "number";
  }
  if (brand === "telegram") {
    if (path.includes("joinchat") || path.startsWith("/+") || /t\.me\/\+/i.test(v) || v.trim().startsWith("+")) {
      return "group";
    }
    if (path.startsWith("/s/") || path.startsWith("/c/")) return "channel";
    if (digits(v).length >= 7 && !/[a-z]/i.test(handle(v))) return "number";
    return "username";
  }
  return digits(v).length >= 7 ? "number" : "username";
}

function whatsappTapHref(value: string): string {
  const exact = canonicalizeShareHref(value);
  if (exact) {
    try {
      const url = new URL(exact);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const path = url.pathname;
      if (host === "chat.whatsapp.com") {
        const code = path.split("/").filter(Boolean)[0];
        return code ? `https://chat.whatsapp.com/${code}` : exact;
      }
      if ((host === "whatsapp.com" || host === "www.whatsapp.com") && path.includes("/channel/")) {
        const id = path.split("/channel/")[1]?.split("/")[0];
        return id ? `https://www.whatsapp.com/channel/${id}` : exact;
      }
      if (host === "api.whatsapp.com") {
        const phone = url.searchParams.get("phone") || digits(path);
        const text = url.searchParams.get("text");
        if (phone) {
          const next = new URL(`https://wa.me/${phone}`);
          if (text) next.searchParams.set("text", text);
          return next.toString();
        }
      }
      return exact;
    } catch {
      return exact;
    }
  }
  const kind = detectChatLinkKind("whatsapp", value);
  if (kind === "group") {
    const code = value.trim().split("/").filter(Boolean).pop() || "";
    return code ? `https://chat.whatsapp.com/${code.replace(/[^A-Za-z0-9]/g, "")}` : value.trim();
  }
  if (kind === "channel") {
    const id = value.trim().replace(/^.*channel\//i, "").split(/[/?#]/)[0];
    return id ? `https://www.whatsapp.com/channel/${id}` : value.trim();
  }
  const d = digits(value);
  if (d.length >= 7) return `https://wa.me/${d}`;
  const name = handle(value);
  return name ? `https://wa.me/${encodeURIComponent(name)}` : "";
}

/** One catalog for guest buttons, studio fields, and API validation. */
export const DIGITAL_CARD_SOCIAL_NETWORKS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    group: "chat",
    icon: "phone",
    placeholder: "number, @, group, or channel link",
    href: (v) => whatsappTapHref(v),
  },
  {
    key: "whatsappbusiness",
    label: "WhatsApp Business",
    group: "chat",
    icon: "phone",
    placeholder: "business number or click-to-chat link",
    href: (v) => whatsappTapHref(v),
    acceptsQr: true,
  },
  {
    key: "telegram",
    label: "Telegram",
    group: "chat",
    icon: "send",
    placeholder: "username, group, or channel link",
    href: (v) => asUrlOr(v, (clean) => `https://t.me/${clean}`),
  },
  {
    key: "wechat",
    label: "WeChat",
    group: "chat",
    icon: "message",
    placeholder: "WeChat ID or link",
    href: (v) => asUrlOr(v, (clean) => `weixin://dl/chat?${encodeURIComponent(clean)}`),
    acceptsQr: true,
  },
  {
    key: "messenger",
    label: "Messenger",
    group: "chat",
    icon: "messages",
    placeholder: "username or m.me link",
    href: (v) => asUrlOr(v, (clean) => `https://m.me/${clean}`),
  },
  {
    key: "signal",
    label: "Signal",
    group: "chat",
    icon: "message",
    placeholder: "number or share link",
    href: (v) => asUrlOr(v, (clean) => `https://signal.me/#p/${digits(clean) || clean}`),
    acceptsQr: true,
  },
  {
    key: "line",
    label: "LINE",
    group: "chat",
    icon: "message",
    placeholder: "ID or link",
    href: (v) => asUrlOr(v, (clean) => `https://line.me/ti/p/~${clean}`),
    acceptsQr: true,
  },
  {
    key: "viber",
    label: "Viber",
    group: "chat",
    icon: "phone",
    placeholder: "number or share link",
    href: (v) => asUrlOr(v, (clean) => `viber://chat?number=${digits(clean)}`),
    acceptsQr: true,
  },
  {
    key: "instagram",
    label: "Instagram",
    group: "social",
    icon: "instagram",
    placeholder: "@username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.instagram.com/${clean}`),
  },
  {
    key: "tiktok",
    label: "TikTok",
    group: "social",
    icon: "video",
    placeholder: "@username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.tiktok.com/@${clean}`),
  },
  {
    key: "x",
    label: "X",
    group: "social",
    icon: "twitter",
    placeholder: "@username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://x.com/${clean}`),
  },
  {
    key: "threads",
    label: "Threads",
    group: "social",
    icon: "at",
    placeholder: "@username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.threads.net/@${clean}`),
  },
  {
    key: "facebook",
    label: "Facebook",
    group: "social",
    icon: "facebook",
    placeholder: "page, username, or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.facebook.com/${clean}`),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    group: "social",
    icon: "linkedin",
    placeholder: "profile or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.linkedin.com/in/${clean}`),
  },
  {
    key: "youtube",
    label: "YouTube",
    group: "social",
    icon: "youtube",
    placeholder: "@channel, video, or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.youtube.com/@${clean.replace(/^@/, "")}`),
  },
  {
    key: "snapchat",
    label: "Snapchat",
    group: "social",
    icon: "camera",
    placeholder: "@username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.snapchat.com/add/${clean}`),
    acceptsQr: true,
  },
  {
    key: "pinterest",
    label: "Pinterest",
    group: "social",
    icon: "hash",
    placeholder: "@username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://www.pinterest.com/${clean}`),
  },
  {
    key: "reddit",
    label: "Reddit",
    group: "social",
    icon: "hash",
    placeholder: "username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://reddit.com/u/${clean}`),
  },
  {
    key: "discord",
    label: "Discord",
    group: "social",
    icon: "messages",
    placeholder: "invite or user link",
    href: (v) => asUrlOr(v, (clean) => `https://discord.com/users/${clean}`),
  },
  {
    key: "bluesky",
    label: "Bluesky",
    group: "social",
    icon: "at",
    placeholder: "handle or share link",
    href: (v) => asUrlOr(v, (clean) => `https://bsky.app/profile/${clean}`),
  },
  {
    key: "trendshub",
    label: "TrendsHub",
    group: "social",
    icon: "globe",
    placeholder: "profile link or username",
    href: (v) => asUrlOr(v, (clean) => `https://www.trendshub.live/${clean}`),
  },
  {
    key: "website",
    label: "Website",
    group: "social",
    icon: "globe",
    placeholder: "www. or http://",
    href: (v) => websiteHrefFromValue(v),
  },
  {
    key: "location",
    label: "Location",
    group: "social",
    icon: "globe",
    placeholder: "Google Maps, Amap, or a street address",
    href: (v) => celeCardPlaceHref(v),
  },
  {
    key: "other",
    label: "Other page",
    group: "social",
    icon: "globe",
    placeholder: "Any page or app link",
    href: (v) => otherLinkHref(v),
  },
  {
    key: "github",
    label: "GitHub",
    group: "create",
    icon: "github",
    placeholder: "username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://github.com/${clean}`),
  },
  {
    key: "twitch",
    label: "Twitch",
    group: "create",
    icon: "tv",
    placeholder: "username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://twitch.tv/${clean}`),
  },
  {
    key: "spotify",
    label: "Spotify",
    group: "create",
    icon: "music",
    placeholder: "artist, track, or share link",
    href: (v) => asUrlOr(v, (clean) => `https://open.spotify.com/user/${clean}`),
  },
  {
    key: "applemusic",
    label: "Apple Music",
    group: "create",
    icon: "headphones",
    placeholder: "artist or link",
    href: (v) => asUrlOr(v, (clean) => `https://music.apple.com/search?term=${encodeURIComponent(clean)}`),
  },
  {
    key: "behance",
    label: "Behance",
    group: "create",
    icon: "play",
    placeholder: "username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://behance.net/${clean}`),
  },
  {
    key: "dribbble",
    label: "Dribbble",
    group: "create",
    icon: "play",
    placeholder: "username or share link",
    href: (v) => asUrlOr(v, (clean) => `https://dribbble.com/${clean}`),
  },
  {
    key: "medium",
    label: "Medium",
    group: "create",
    icon: "hash",
    placeholder: "username or story link",
    href: (v) => asUrlOr(v, (clean) => `https://medium.com/@${clean}`),
  },
  {
    key: "bank",
    label: "Bank",
    group: "pay",
    icon: "globe",
    placeholder: "Bank account",
    href: () => "",
  },
  {
    key: "momo",
    label: "MTN MoMo",
    group: "pay",
    icon: "phone",
    placeholder: "MoMo number",
    acceptsQr: true,
    href: (v) => asUrlOr(v, () => ""),
  },
  {
    key: "telecelcash",
    label: "Telecel Cash",
    group: "pay",
    icon: "phone",
    placeholder: "wallet number",
    acceptsQr: true,
    href: (v) => asUrlOr(v, () => ""),
  },
  {
    key: "airteltigo",
    label: "AT Money",
    group: "pay",
    icon: "phone",
    placeholder: "wallet number",
    acceptsQr: true,
    href: (v) => asUrlOr(v, () => ""),
  },
  {
    key: "mpesa",
    label: "M-Pesa",
    group: "pay",
    icon: "phone",
    placeholder: "M-Pesa number",
    acceptsQr: true,
    href: (v) => asUrlOr(v, () => ""),
  },
  {
    key: "paypal",
    label: "PayPal",
    group: "pay",
    icon: "globe",
    placeholder: "paypal.me name or link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://www.paypal.me/${clean.replace(/^paypal\.me\//i, "")}`),
  },
  {
    key: "cashapp",
    label: "Cash App",
    group: "pay",
    icon: "hash",
    placeholder: "$cashtag or link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://cash.app/$${clean.replace(/^\$/, "")}`),
  },
  {
    key: "zelle",
    label: "Zelle",
    group: "pay",
    icon: "send",
    placeholder: "email or mobile number",
    acceptsQr: true,
    href: (v) => {
      const t = v.trim();
      if (/^https?:\/\//i.test(t)) return t;
      if (t.includes("@")) return `mailto:${t}`;
      const d = digits(t);
      return d.length >= 7 ? `tel:${d}` : t;
    },
  },
  {
    key: "venmo",
    label: "Venmo",
    group: "pay",
    icon: "send",
    placeholder: "username",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://venmo.com/${clean}`),
  },
  {
    key: "alipay",
    label: "Alipay",
    group: "pay",
    icon: "globe",
    placeholder: "Alipay ID or link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://qr.alipay.com/${clean}`),
  },
  {
    key: "wechatpay",
    label: "WeChat Pay",
    group: "pay",
    icon: "message",
    placeholder: "WeChat Pay ID or link",
    acceptsQr: true,
    href: (v) => {
      const t = v.trim();
      if (/^https?:\/\//i.test(t) || /^weixin:/i.test(t)) return t;
      return t ? `weixin://dl/business/?t=${encodeURIComponent(t)}` : "";
    },
  },
  {
    key: "wise",
    label: "Wise",
    group: "pay",
    icon: "globe",
    placeholder: "Wise username or link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://wise.com/pay/me/${clean}`),
  },
  {
    key: "revolut",
    label: "Revolut",
    group: "pay",
    icon: "globe",
    placeholder: "revolut.me name",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://revolut.me/${clean}`),
  },
  {
    key: "paystack",
    label: "Paystack",
    group: "pay",
    icon: "globe",
    placeholder: "payment link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://${clean}`),
  },
  {
    key: "flutterwave",
    label: "Flutterwave",
    group: "pay",
    icon: "globe",
    placeholder: "payment link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://${clean}`),
  },
  {
    key: "gcash",
    label: "GCash",
    group: "pay",
    icon: "phone",
    placeholder: "GCash number or link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, () => ""),
  },
  {
    key: "chipper",
    label: "Chipper Cash",
    group: "pay",
    icon: "send",
    placeholder: "tag or link",
    acceptsQr: true,
    href: (v) => asUrlOr(v, (clean) => `https://chippercash.com/${clean}`),
  },
] as const satisfies readonly DigitalCardSocialNetworkBase[];

export type DigitalCardSocialKey = (typeof DIGITAL_CARD_SOCIAL_NETWORKS)[number]["key"];

export type DigitalCardSocialNetwork = Omit<DigitalCardSocialNetworkBase, "key"> & {
  key: DigitalCardSocialKey;
};

export type DigitalCardFieldValue = string | string[];

export const CONTACT_KIND_TAGS = [
  { id: "personal", label: "Personal" },
  { id: "business", label: "Business" },
] as const;

export type ContactKindTag = (typeof CONTACT_KIND_TAGS)[number]["id"];

export function normalizeContactKindTag(raw: unknown): ContactKindTag | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "personal" || value === "business") return value;
  return null;
}

export function contactKindLabel(tag?: string | null): string | null {
  const kind = normalizeContactKindTag(tag);
  if (!kind) return null;
  return CONTACT_KIND_TAGS.find((item) => item.id === kind)?.label ?? null;
}

/** Personal numbers use a mobile. Business numbers use a desk phone. */
export function phoneBrandMarkId(tag?: string | null): "phone-personal" | "phone-business" | "phone" {
  const kind = normalizeContactKindTag(tag);
  if (kind === "business") return "phone-business";
  if (kind === "personal") return "phone-personal";
  return "phone";
}

export function reachBrandMarkId(item: { brand: string; kindTag?: ContactKindTag | null }): string {
  if (item.brand === "phone") return phoneBrandMarkId(item.kindTag);
  return item.brand;
}

export function phoneGroupBrandMarkId(items: Array<{ kindTag?: ContactKindTag | null }>): string {
  if (!items.length) return "phone";
  const tags = items.map((item) => normalizeContactKindTag(item.kindTag));
  const first = tags[0];
  if (first && tags.every((tag) => tag === first)) return phoneBrandMarkId(first);
  return "phone";
}

export function alignedContactTags(values: string[], raw: unknown): Array<ContactKindTag | ""> {
  const list = Array.isArray(raw) ? raw : [];
  return values.map((_, index) => normalizeContactKindTag(list[index]) ?? "");
}

export type DigitalCardSocials = Partial<Record<DigitalCardSocialKey, DigitalCardFieldValue>> & {
  emails?: string[];
  phones?: string[];
  websites?: string[];
  emailTags?: Array<ContactKindTag | "">;
  phoneTags?: Array<ContactKindTag | "">;
  /** Number, username, group, or channel marks for WhatsApp and Telegram. */
  linkKinds?: Partial<Record<string, Array<ChatLinkKind | "">>>;
  pronouns?: string;
  /** Receive QR images keyed by `${brand}-${index}` after compacting. */
  payQr?: Record<string, string>;
  /** Featured full-width taps, in guest order. Missing ids stay off the page. */
  stackOrder?: string[];
  /** Official-logo icon row, in guest order. */
  dockOrder?: string[];
  /** Per reach-item visibility. Missing key is PUBLIC. */
  reachVisibility?: Record<string, "PUBLIC" | "CODE_PROTECTED" | "REQUEST_ACCESS">;
  /** Circle, square, soft-square, or arch portrait plate. Missing key uses the theme default. */
  portraitFrame?: "circle" | "square" | "rounded" | "arch";
  /** Cropped company mark that sits beside the house name. */
  companyLogoUrl?: string;
  /** Owner layout, atmosphere, ornament, blended paper, lettering, and ink. Missing keys keep the template. */
  design?: CeleCardDesign;
  /** Guest book-a-time desk. Missing or disabled stays off the card. */
  meeting?: import("@/lib/digital-business-card/meetings").CeleCardMeetingDesk;
  /** Optional business extras. Off unless the owner enables them. */
  business?: import("@/lib/digital-business-card/business-profile").CeleYouBusinessProfile;
};

export type DigitalCardReachSurface = "stack" | "dock";

const FEATURED_BRANDS = new Set([
  "email",
  "phone",
  "website",
  "whatsapp",
  "whatsappbusiness",
  "location",
  "other",
  "meeting",
]);

export type DigitalCardSocialForm = Record<DigitalCardSocialKey, string[]>;

export const DIGITAL_CARD_SOCIAL_KEYS = DIGITAL_CARD_SOCIAL_NETWORKS.map((n) => n.key) as DigitalCardSocialKey[];

export const DIGITAL_CARD_SOCIAL_GROUPS: { id: DigitalCardSocialGroup; label: string }[] = [
  { id: "chat", label: "Chat and calls" },
  { id: "social", label: "Social" },
  { id: "create", label: "Create and listen" },
  { id: "pay", label: "Payment channels & Wallet" },
];

export const DIGITAL_CARD_PAY_KEYS = DIGITAL_CARD_SOCIAL_NETWORKS.filter((n) => n.group === "pay").map(
  (n) => n.key
) as DigitalCardSocialKey[];

export const DIGITAL_CARD_PAY_FAMILIES = [
  {
    id: "mobile-money",
    label: "Mobile money",
    keys: ["momo", "telecelcash", "airteltigo", "mpesa", "gcash"],
  },
  {
    id: "send-a-link",
    label: "Send a link",
    keys: ["paypal", "cashapp", "zelle", "venmo", "wise", "revolut", "chipper"],
  },
  {
    id: "payment-links",
    label: "Payment links",
    keys: ["paystack", "flutterwave"],
  },
  {
    id: "scan",
    label: "Scan wallets",
    keys: ["alipay", "wechatpay"],
  },
  {
    id: "bank",
    label: "Bank",
    keys: ["bank"],
  },
] as const satisfies readonly { id: string; label: string; keys: readonly DigitalCardSocialKey[] }[];

export function payFamilyIdForKey(key: string): (typeof DIGITAL_CARD_PAY_FAMILIES)[number]["id"] | null {
  return DIGITAL_CARD_PAY_FAMILIES.find((family) => (family.keys as readonly string[]).includes(key))?.id ?? null;
}

export function isPayNetwork(key: string): boolean {
  return DIGITAL_CARD_PAY_KEYS.includes(key as DigitalCardSocialKey);
}

export const BANK_ACCOUNT_TYPES = [
  { id: "savings", label: "Savings" },
  { id: "current", label: "Current" },
  { id: "checking", label: "Checking" },
  { id: "business", label: "Business" },
  { id: "other", label: "Other" },
] as const;

export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number]["id"];

export type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: BankAccountType | "";
  notes: string;
};

const BANK_RECORD_PREFIX = "bankv1:";

function clipBankField(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function emptyBankAccount(): BankAccount {
  return { bankName: "", accountName: "", accountNumber: "", accountType: "", notes: "" };
}

export function normalizeBankAccountType(raw: unknown): BankAccountType | "" {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return BANK_ACCOUNT_TYPES.some((item) => item.id === value) ? (value as BankAccountType) : "";
}

export function parseBankAccount(raw: string | null | undefined): BankAccount {
  const empty = emptyBankAccount();
  const value = raw?.trim() ?? "";
  if (!value) return empty;
  const json = value.startsWith(BANK_RECORD_PREFIX) ? value.slice(BANK_RECORD_PREFIX.length) : value;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return empty;
    return {
      bankName: clipBankField(String(parsed.bankName ?? parsed.bank ?? ""), 80),
      accountName: clipBankField(String(parsed.accountName ?? parsed.name ?? ""), 80),
      accountNumber: clipBankField(String(parsed.accountNumber ?? parsed.number ?? ""), 40),
      accountType: normalizeBankAccountType(parsed.accountType ?? parsed.type),
      notes: clipBankField(String(parsed.notes ?? parsed.other ?? ""), 160),
    };
  } catch {
    return empty;
  }
}

export function serializeBankAccount(account: BankAccount): string {
  const next: BankAccount = {
    bankName: clipBankField(account.bankName, 80),
    accountName: clipBankField(account.accountName, 80),
    accountNumber: clipBankField(account.accountNumber, 40),
    accountType: normalizeBankAccountType(account.accountType),
    notes: clipBankField(account.notes, 160),
  };
  if (!next.bankName && !next.accountName && !next.accountNumber && !next.accountType && !next.notes) return "";
  return `${BANK_RECORD_PREFIX}${JSON.stringify(next)}`;
}

export function isBankAccountComplete(account: BankAccount): boolean {
  return Boolean(account.bankName && account.accountName && account.accountNumber.replace(/\s/g, "").length >= 4);
}

export function bankAccountTypeLabel(type?: string | null): string | null {
  const id = normalizeBankAccountType(type);
  return BANK_ACCOUNT_TYPES.find((item) => item.id === id)?.label ?? null;
}

export function formatBankAccountCopy(account: BankAccount): string {
  return bankAccountDisplayRows(account)
    .map((row) => `${row.label} ${row.value}`)
    .join("\n");
}

export function bankAccountDisplayRows(account: BankAccount): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (account.bankName) rows.push({ label: "Bank name", value: account.bankName });
  if (account.accountName) rows.push({ label: "Account name", value: account.accountName });
  if (account.accountNumber) rows.push({ label: "Account number", value: account.accountNumber });
  const type = bankAccountTypeLabel(account.accountType);
  if (type) rows.push({ label: "Account type", value: type });
  if (account.notes) rows.push({ label: "Other information", value: account.notes });
  return rows;
}

export function networkAcceptsQr(key: string): boolean {
  const network = DIGITAL_CARD_SOCIAL_NETWORKS.find((item) => item.key === key) as
    | { acceptsQr?: boolean }
    | undefined;
  return Boolean(network?.acceptsQr);
}

/** Chat and social apps whose add-friend flow is a scan QR, not only a web link. */
export function isQrShareNetwork(key: string): boolean {
  return networkAcceptsQr(key) && !isPayNetwork(key);
}

function qrSlotMax(payQr: Record<string, string> | undefined, key: string, valuesLen = 0): number {
  const indexes = Object.keys(payQr ?? {})
    .filter((id) => id.startsWith(`${key}-`))
    .map((id) => Number(id.slice(key.length + 1)));
  return Math.max(valuesLen, ...indexes.map((n) => n + 1), 0);
}

export const DIGITAL_CARD_REACH_MAX = 12;

export function digitalCardSocialHref(key: DigitalCardSocialKey | string, value: string): string {
  const network = DIGITAL_CARD_SOCIAL_NETWORKS.find((n) => n.key === key);
  if (!network) {
    const v = value.trim();
    return /^https?:\/\//i.test(v) ? v : v;
  }
  return network.href(value);
}

type NativeAppSpec = {
  packageName: string;
  appHref: (handle: string) => string;
  intentPath?: (handle: string) => string;
};

const NATIVE_APPS: Partial<Record<string, NativeAppSpec>> = {
  instagram: {
    packageName: "com.instagram.android",
    appHref: (h) => `instagram://user?username=${encodeURIComponent(h)}`,
    intentPath: (h) => `instagram.com/_u/${encodeURIComponent(h)}`,
  },
  tiktok: {
    packageName: "com.zhiliaoapp.musically",
    appHref: (h) => `tiktok://user?unique_id=${encodeURIComponent(h)}`,
    intentPath: (h) => `www.tiktok.com/@${encodeURIComponent(h)}`,
  },
  x: {
    packageName: "com.twitter.android",
    appHref: (h) => `twitter://user?screen_name=${encodeURIComponent(h)}`,
    intentPath: (h) => `x.com/${encodeURIComponent(h)}`,
  },
  threads: {
    packageName: "com.instagram.barcelona",
    appHref: (h) => `barcelona://user?username=${encodeURIComponent(h)}`,
    intentPath: (h) => `www.threads.net/@${encodeURIComponent(h)}`,
  },
  facebook: {
    packageName: "com.facebook.katana",
    appHref: (h) => `fb://facewebmodal/f?href=${encodeURIComponent(`https://www.facebook.com/${h}`)}`,
    intentPath: (h) => `www.facebook.com/${encodeURIComponent(h)}`,
  },
  linkedin: {
    packageName: "com.linkedin.android",
    appHref: (h) => `linkedin://in/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.linkedin.com/in/${encodeURIComponent(h)}`,
  },
  youtube: {
    packageName: "com.google.android.youtube",
    appHref: (h) => `vnd.youtube://www.youtube.com/@${encodeURIComponent(h)}`,
    intentPath: (h) => `www.youtube.com/@${encodeURIComponent(h)}`,
  },
  whatsapp: {
    packageName: "com.whatsapp",
    appHref: (h) => `whatsapp://send?phone=${h}`,
    intentPath: (h) => `send?phone=${h}`,
  },
  whatsappbusiness: {
    packageName: "com.whatsapp.w4b",
    appHref: (h) => `whatsapp://send?phone=${h}`,
    intentPath: (h) => `send?phone=${h}`,
  },
  telegram: {
    packageName: "org.telegram.messenger",
    appHref: (h) => `tg://resolve?domain=${encodeURIComponent(h)}`,
    intentPath: (h) => `t.me/${encodeURIComponent(h)}`,
  },
  messenger: {
    packageName: "com.facebook.orca",
    appHref: (h) => `fb-messenger://user-thread/${encodeURIComponent(h)}`,
    intentPath: (h) => `m.me/${encodeURIComponent(h)}`,
  },
  snapchat: {
    packageName: "com.snapchat.android",
    appHref: (h) => `snapchat://add/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.snapchat.com/add/${encodeURIComponent(h)}`,
  },
  pinterest: {
    packageName: "com.pinterest",
    appHref: (h) => `pinterest://user/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.pinterest.com/${encodeURIComponent(h)}`,
  },
  reddit: {
    packageName: "com.reddit.frontpage",
    appHref: (h) => `reddit://user/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.reddit.com/user/${encodeURIComponent(h)}`,
  },
  discord: {
    packageName: "com.discord",
    appHref: (h) => `discord://users/${encodeURIComponent(h)}`,
    intentPath: (h) => `discord.com/users/${encodeURIComponent(h)}`,
  },
  github: {
    packageName: "com.github.android",
    appHref: (h) => `github://user?username=${encodeURIComponent(h)}`,
    intentPath: (h) => `github.com/${encodeURIComponent(h)}`,
  },
  twitch: {
    packageName: "tv.twitch.android.app",
    appHref: (h) => `twitch://stream/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.twitch.tv/${encodeURIComponent(h)}`,
  },
  spotify: {
    packageName: "com.spotify.music",
    appHref: (h) => `spotify:user:${encodeURIComponent(h)}`,
    intentPath: (h) => `open.spotify.com/user/${encodeURIComponent(h)}`,
  },
  bluesky: {
    packageName: "xyz.blueskyweb.app",
    appHref: (h) => `bluesky://profile/${encodeURIComponent(h)}`,
    intentPath: (h) => `bsky.app/profile/${encodeURIComponent(h)}`,
  },
  signal: {
    packageName: "org.thoughtcrime.securesms",
    appHref: (h) => `sgnl://signal.me/#p/${encodeURIComponent(h)}`,
    intentPath: (h) => `signal.me/#p/${encodeURIComponent(h)}`,
  },
  line: {
    packageName: "jp.naver.line.android",
    appHref: (h) => `line://ti/p/~${encodeURIComponent(h)}`,
    intentPath: (h) => `line.me/ti/p/~${encodeURIComponent(h)}`,
  },
  viber: {
    packageName: "com.viber.voip",
    appHref: (h) => `viber://chat?number=${h}`,
    intentPath: (h) => `chat?number=${h}`,
  },
  wechat: {
    packageName: "com.tencent.mm",
    appHref: (h) => `weixin://dl/chat?${encodeURIComponent(h)}`,
    intentPath: (h) => `dl/chat?${encodeURIComponent(h)}`,
  },
  paypal: {
    packageName: "com.paypal.android.p2pmobile",
    appHref: (h) => `paypal://paypal.me/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.paypal.me/${encodeURIComponent(h)}`,
  },
  cashapp: {
    packageName: "com.squareup.cash",
    appHref: (h) => `cashme://cash.me/$${encodeURIComponent(h.replace(/^\$/, ""))}`,
    intentPath: (h) => `cash.app/$${encodeURIComponent(h.replace(/^\$/, ""))}`,
  },
  venmo: {
    packageName: "com.venmo",
    appHref: (h) => `venmo://users/${encodeURIComponent(h)}`,
    intentPath: (h) => `venmo.com/${encodeURIComponent(h)}`,
  },
  revolut: {
    packageName: "com.revolut.revolut",
    appHref: (h) => `revolut://app/me/${encodeURIComponent(h)}`,
    intentPath: (h) => `revolut.me/${encodeURIComponent(h)}`,
  },
  wechatpay: {
    packageName: "com.tencent.mm",
    appHref: (h) => `weixin://dl/business/?t=${encodeURIComponent(h)}`,
    intentPath: (h) => `dl/business/?t=${encodeURIComponent(h)}`,
  },
  applemusic: {
    packageName: "com.apple.android.music",
    appHref: (h) => `music://music.apple.com/search?term=${encodeURIComponent(h)}`,
    intentPath: (h) => `music.apple.com/search?term=${encodeURIComponent(h)}`,
  },
  behance: {
    packageName: "com.behance.behance",
    appHref: (h) => `behance://profile/${encodeURIComponent(h)}`,
    intentPath: (h) => `www.behance.net/${encodeURIComponent(h)}`,
  },
  dribbble: {
    packageName: "com.dribbble.dribbble",
    appHref: (h) => `dribbble://shots?user=${encodeURIComponent(h)}`,
    intentPath: (h) => `dribbble.com/${encodeURIComponent(h)}`,
  },
  medium: {
    packageName: "com.medium.reader",
    appHref: (h) => `medium://@${encodeURIComponent(h)}`,
    intentPath: (h) => `medium.com/@${encodeURIComponent(h)}`,
  },
};

const NATIVE_SCHEME_FOR_INTENT: Partial<Record<string, string>> = {
  whatsapp: "whatsapp",
  whatsappbusiness: "whatsapp",
  viber: "viber",
  wechat: "weixin",
  wechatpay: "weixin",
  telegram: "https",
};

function androidIntentUrl(path: string, packageName: string, fallback: string, scheme = "https") {
  const fallbackPart = /^https?:\/\//i.test(fallback)
    ? `;S.browser_fallback_url=${encodeURIComponent(fallback)}`
    : "";
  return `intent://${path}#Intent;scheme=${scheme};package=${packageName}${fallbackPart};end`;
}

const HANDLE_SKIP = new Set([
  "in",
  "company",
  "add",
  "u",
  "user",
  "users",
  "r",
  "profile",
  "artist",
  "invite",
  "channel",
  "c",
  "@",
  "p",
  "reel",
  "reels",
  "tv",
  "stories",
  "share",
  "video",
  "watch",
  "shorts",
  "posts",
  "pin",
  "comments",
  "status",
  "track",
  "album",
  "playlist",
  "episode",
]);

export function extractReachHandle(brand: string, value: string): string {
  const v = value.trim();
  if (!v) return "";
  const href = canonicalizeShareHref(v) || v;
  if (brand === "wechat" && /^weixin:/i.test(href)) {
    const query = href.split("?")[1] || "";
    try {
      return handle(decodeURIComponent(query.replace(/^id=/i, "")));
    } catch {
      return handle(query);
    }
  }
  if (
    brand === "whatsapp" ||
    brand === "whatsappbusiness" ||
    brand === "viber" ||
    brand === "signal" ||
    brand === "phone" ||
    brand === "momo" ||
    brand === "telecelcash" ||
    brand === "airteltigo" ||
    brand === "mpesa" ||
    brand === "gcash"
  ) {
    if (/^https?:\/\//i.test(href)) {
      try {
        const url = new URL(href);
        const fromPath = url.pathname.replace(/\D/g, "");
        const fromQuery = url.searchParams.get("phone") || "";
        return digits(fromPath || fromQuery || href);
      } catch {
        return digits(v);
      }
    }
    return digits(v);
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      const parts = url.pathname.split("/").filter(Boolean).map((part) => part.replace(/^@/, ""));
      if (brand === "linkedin") {
        const idx = parts.findIndex((part) => part === "in" || part === "company");
        return idx >= 0 ? parts[idx + 1] ?? "" : parts[0] ?? "";
      }
      if (brand === "snapchat") {
        const idx = parts.findIndex((part) => part === "add");
        return idx >= 0 ? parts[idx + 1] ?? "" : parts[0] ?? "";
      }
      if (brand === "reddit") {
        const idx = parts.findIndex((part) => part === "u" || part === "user" || part === "r");
        return idx >= 0 ? parts[idx + 1] ?? "" : parts[0] ?? "";
      }
      if (brand === "spotify") {
        const idx = parts.findIndex((part) => part === "user" || part === "artist");
        return idx >= 0 ? parts[idx + 1] ?? "" : parts[0] ?? "";
      }
      if (brand === "discord") {
        const idx = parts.findIndex((part) => part === "users" || part === "invite");
        return idx >= 0 ? parts[idx + 1] ?? "" : parts[0] ?? "";
      }
      if (brand === "bluesky") {
        const idx = parts.findIndex((part) => part === "profile");
        return idx >= 0 ? parts[idx + 1] ?? "" : parts[0] ?? "";
      }
      const first = parts.find((part) => part && !HANDLE_SKIP.has(part.toLowerCase())) ?? "";
      return first;
    } catch {
      return "";
    }
  }
  return handle(v);
}

export function nativeOpenFor(
  brand: string,
  value: string,
  webHref: string
): { appHref?: string; androidIntent?: string } {
  if (brand === "location") {
    const place = parseCeleCardPlace(value);
    if (!place) return {};
    if (place.lat != null && place.lng != null && place.geoHref) {
      return {
        appHref: place.geoHref,
        androidIntent: androidIntentUrl(
          `${place.lat},${place.lng}?q=${encodeURIComponent(place.label)}`,
          "com.google.android.apps.maps",
          place.href,
          "geo"
        ),
      };
    }
    return {};
  }
  const spec = NATIVE_APPS[brand];
  if (!spec) return {};
  if (isExactPageShare(brand, value, webHref)) {
    const path = webHref.replace(/^https?:\/\//i, "");
    return {
      appHref: webHref,
      androidIntent: androidIntentUrl(path, spec.packageName, webHref, "https"),
    };
  }
  const extracted = extractReachHandle(brand, value);
  if (!extracted) return {};
  const appHref = spec.appHref(extracted);
  const path = spec.intentPath?.(extracted) ?? webHref.replace(/^https?:\/\//i, "");
  const scheme = NATIVE_SCHEME_FOR_INTENT[brand] ?? "https";
  return {
    appHref,
    androidIntent: androidIntentUrl(path, spec.packageName, webHref, scheme),
  };
}

export function isCustomAppScheme(href: string | undefined | null): boolean {
  if (!href) return false;
  return !/^(https?:|mailto:|tel:|sms:)/i.test(href);
}

export type ReachLaunchPlan = {
  mode: "web" | "intent" | "native-then-web";
  web: string;
  native?: string;
};

export function reachLaunchPlan(
  item: Pick<DigitalCardReachItem, "href" | "appHref" | "androidIntent" | "brand">,
  env: { android?: boolean; mobile?: boolean } = {}
): ReachLaunchPlan {
  const web = item.href || "";
  if (!web) return { mode: "web", web };
  if (/^(mailto:|tel:|sms:)/i.test(web) || item.brand === "website") {
    return { mode: "web", web };
  }
  if (env.android && item.androidIntent) {
    return { mode: "intent", native: item.androidIntent, web };
  }
  if (env.mobile && isCustomAppScheme(item.appHref) && item.appHref) {
    return { mode: "native-then-web", native: item.appHref, web };
  }
  return { mode: "web", web };
}

export function socialValueList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const next = value?.trim();
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

export function emptyDigitalCardSocialForm(): DigitalCardSocialForm {
  return Object.fromEntries(DIGITAL_CARD_SOCIAL_KEYS.map((key) => [key, [] as string[]])) as DigitalCardSocialForm;
}

/** True when the wallet already has a number, link, or receive QR for guests. */
export function payWalletHasGuestEntry(
  values: string[] | undefined,
  payQr: Record<string, string> | undefined,
  key: string
): boolean {
  const slots = slottedFieldValues(values);
  const qrMap = payQr ?? {};
  const max = Math.max(
    slots.length,
    ...Object.keys(qrMap)
      .filter((id) => id.startsWith(`${key}-`))
      .map((id) => Number(id.slice(key.length + 1)) + 1 || 0)
  );
  for (let index = 0; index < max; index += 1) {
    const value = (slots[index] ?? "").trim();
    if (key === "bank") {
      if (isCompleteReachValue("bank", value)) return true;
      continue;
    }
    const qr = qrMap[`${key}-${index}`]?.trim();
    if (qr) return true;
    if (!value) continue;
    const href = digitalCardSocialHref(key, value);
    if (
      isCompleteReachValue(key, value) &&
      (href ? isLiveReachHref(href) : isPayNetwork(key))
    ) {
      return true;
    }
  }
  return false;
}

/** Studio shows a wallet once the owner opens it, even before the first fill. */
export function isPayWalletOpenOnDesk(
  values: string[] | undefined,
  payQr: Record<string, string> | undefined,
  key: string
): boolean {
  if ((values ?? []).length > 0) return true;
  return Object.entries(payQr ?? {}).some(([id, qr]) => id.startsWith(`${key}-`) && Boolean(qr?.trim()));
}

/** Chat, social, and create channels use the same open-on-desk rule as wallets. */
export function isReachChannelOpenOnDesk(
  values: string[] | undefined,
  payQr: Record<string, string> | undefined,
  key: string
): boolean {
  return isPayWalletOpenOnDesk(values, payQr, key);
}

export function toDigitalCardSocialForm(raw?: DigitalCardSocials | null): DigitalCardSocialForm {
  const form = emptyDigitalCardSocialForm();
  if (!raw) return form;
  for (const key of DIGITAL_CARD_SOCIAL_KEYS) {
    if (isPayNetwork(key) || networkAcceptsQr(key)) {
      const slots = slottedFieldValues(raw[key]);
      const max = qrSlotMax(raw.payQr, key, slots.length);
      const list: string[] = [];
      for (let index = 0; index < max; index += 1) {
        const value = (slots[index] ?? "").trim();
        const qr = raw.payQr?.[`${key}-${index}`]?.trim();
        if (!value && !qr) continue;
        list.push(value);
      }
      form[key] = list.length ? list : [];
      continue;
    }
    const list = socialValueList(raw[key]);
    form[key] = list.length ? list : [];
  }
  return form;
}

export function toPayQrMap(raw?: DigitalCardSocials | null): Record<string, string> {
  if (!raw?.payQr) return {};
  return { ...raw.payQr };
}

function slottedFieldValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : ""));
}

export function compactPayQr(
  input: Partial<Record<DigitalCardSocialKey, string | string[]>>,
  payQr?: Record<string, string> | null
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!payQr) return out;
  const keys = DIGITAL_CARD_SOCIAL_KEYS.filter((key) => networkAcceptsQr(key));
  for (const key of keys) {
    const slots = slottedFieldValues(input[key]);
    const max = qrSlotMax(payQr, key, slots.length);
    let live = 0;
    for (let index = 0; index < Math.min(max, DIGITAL_CARD_REACH_MAX); index += 1) {
      const value = (slots[index] ?? "").trim();
      const qr = payQr[`${key}-${index}`]?.trim();
      if (!value && !qr) continue;
      if (qr) out[`${key}-${live}`] = qr;
      live += 1;
    }
  }
  return out;
}

export function compactDigitalCardSocials(
  input: Partial<Record<DigitalCardSocialKey, string | string[]>>,
  payQr?: Record<string, string> | null
): DigitalCardSocials {
  const out: DigitalCardSocials = {};
  for (const key of DIGITAL_CARD_SOCIAL_KEYS) {
    if (isPayNetwork(key) || networkAcceptsQr(key)) {
      const slots = slottedFieldValues(input[key]);
      const kept: string[] = [];
      const max = qrSlotMax(payQr ?? undefined, key, slots.length);
      for (let index = 0; index < Math.min(max, DIGITAL_CARD_REACH_MAX); index += 1) {
        const value = (slots[index] ?? "").trim();
        const qr = payQr?.[`${key}-${index}`]?.trim();
        if (!value && !qr) continue;
        kept.push(value);
      }
      if (kept.length === 1) out[key] = kept[0] || (isPayNetwork(key) ? [""] : kept[0]);
      else if (kept.length > 1) out[key] = kept;
      continue;
    }
    const list = socialValueList(input[key]).slice(0, DIGITAL_CARD_REACH_MAX);
    if (list.length === 1) out[key] = list[0];
    else if (list.length > 1) out[key] = list;
  }
  const qr = compactPayQr(input, payQr);
  if (Object.keys(qr).length) out.payQr = qr;
  return out;
}

export function normalizeSocials(raw: unknown): DigitalCardSocials {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const payQr =
    record.payQr && typeof record.payQr === "object" && !Array.isArray(record.payQr)
      ? Object.fromEntries(
          Object.entries(record.payQr as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1].trim())
          )
        )
      : {};
  const out = compactDigitalCardSocials(record, payQr);
  const emails = socialValueList(record.emails).slice(0, DIGITAL_CARD_REACH_MAX);
  const phones = socialValueList(record.phones).slice(0, DIGITAL_CARD_REACH_MAX);
  const websites = socialValueList(record.websites).slice(0, DIGITAL_CARD_REACH_MAX);
  if (emails.length) out.emails = emails;
  if (phones.length) out.phones = phones;
  if (websites.length) out.websites = websites;
  const emailTags = alignedContactTags(emails, record.emailTags);
  const phoneTags = alignedContactTags(phones, record.phoneTags);
  if (emailTags.some(Boolean)) out.emailTags = emailTags;
  if (phoneTags.some(Boolean)) out.phoneTags = phoneTags;
  const rawKinds =
    record.linkKinds && typeof record.linkKinds === "object" && !Array.isArray(record.linkKinds)
      ? (record.linkKinds as Record<string, unknown>)
      : {};
  const linkKinds: NonNullable<DigitalCardSocials["linkKinds"]> = {};
  for (const brand of CHAT_KIND_BRANDS) {
    const values = socialValueList(record[brand]);
    const aligned = values.map((value, index) => {
      const stored = normalizeChatLinkKind(Array.isArray(rawKinds[brand]) ? rawKinds[brand][index] : "");
      return stored || detectChatLinkKind(brand, value);
    });
    if (aligned.length) linkKinds[brand] = aligned;
  }
  if (Object.keys(linkKinds).length) out.linkKinds = linkKinds;
  if (typeof record.pronouns === "string" && record.pronouns.trim()) {
    out.pronouns = record.pronouns.trim();
  }
  const stackOrder = socialValueList(record.stackOrder).slice(0, 40);
  const dockOrder = socialValueList(record.dockOrder).slice(0, 40);
  if (stackOrder.length) out.stackOrder = stackOrder;
  if (dockOrder.length) out.dockOrder = dockOrder;
  const visibilityRaw =
    record.reachVisibility && typeof record.reachVisibility === "object" && !Array.isArray(record.reachVisibility)
      ? (record.reachVisibility as Record<string, unknown>)
      : null;
  if (visibilityRaw) {
    const reachVisibility: NonNullable<DigitalCardSocials["reachVisibility"]> = {};
    for (const [key, value] of Object.entries(visibilityRaw)) {
      const mode = String(value || "").trim().toUpperCase();
      if (mode === "CODE_PROTECTED" || mode === "REQUEST_ACCESS") {
        reachVisibility[key] = mode;
      }
    }
    if (Object.keys(reachVisibility).length) out.reachVisibility = reachVisibility;
  }
  const portraitFrame = String(record.portraitFrame ?? "").trim().toLowerCase();
  if (portraitFrame === "circle" || portraitFrame === "square" || portraitFrame === "rounded" || portraitFrame === "arch") {
    out.portraitFrame = portraitFrame;
  }
  const companyLogoUrl = persistCompanyLogoUrl(record.companyLogoUrl);
  if (companyLogoUrl) out.companyLogoUrl = companyLogoUrl;
  const design = compactCeleCardDesign(record.design);
  if (design) out.design = design;
  const meeting = persistMeetingDesk(record.meeting);
  if (meeting) out.meeting = meeting;
  const business = persistBusinessProfile(record.business);
  if (business) out.business = business;
  return out;
}

const COMPANY_LOGO_MAX = 2000;

/** Keep a stored or live-preview company mark. Rejects script and data URLs. */
export function sanitizeCompanyLogoUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!url || url.length > COMPANY_LOGO_MAX) return null;
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("/") && !url.startsWith("//")) {
    if (url.includes("..") || url.includes("\\") || url.includes("%")) return null;
    if (url.startsWith("/uploads/") || url.startsWith("/digital-cards/")) return url;
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Persistable company mark. Drops blob and data previews. */
export function persistCompanyLogoUrl(raw: unknown): string | undefined {
  const url = sanitizeCompanyLogoUrl(raw);
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return undefined;
  return url;
}

export function defaultReachSurface(brand: string): DigitalCardReachSurface {
  if (FEATURED_BRANDS.has(brand) || isPayNetwork(brand)) return "stack";
  return "dock";
}

const SOCIAL_PROFILE_HOSTS = new Set([
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "threads.net",
  "facebook.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "snapchat.com",
  "pinterest.com",
  "reddit.com",
  "discord.com",
  "discord.gg",
  "bsky.app",
  "trendshub.live",
  "t.me",
  "telegram.me",
  "m.me",
  "wa.me",
  "whatsapp.com",
  "chat.whatsapp.com",
  "github.com",
  "twitch.tv",
  "open.spotify.com",
  "spotify.com",
  "music.apple.com",
  "behance.net",
  "dribbble.com",
  "medium.com",
  "signal.me",
  "line.me",
  "instagr.am",
  "l.instagram.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "fb.com",
  "fb.watch",
  "lnkd.in",
  "pin.it",
  "api.whatsapp.com",
  "chat.whatsapp.com",
]);

const BARE_SOCIAL_PATHS = new Set([
  "",
  "/",
  "/@",
  "/in",
  "/company",
  "/add",
  "/u",
  "/user",
  "/users",
  "/profile",
  "/search",
  "/channel",
  "/c",
  "/p",
  "/reel",
  "/reels",
  "/tv",
  "/stories",
  "/share",
  "/video",
  "/watch",
  "/shorts",
  "/posts",
  "/pin",
]);

export function isLiveReachHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (/^(mailto:|tel:|sms:)$/i.test(value)) return false;
  if (/^mailto:\s*$/i.test(value)) return false;
  if (/^tel:\+?$/.test(value)) return false;
  if (/^https?:\/\/$/i.test(value)) return false;
  if (/^https?:\/\/wa\.me\/?$/i.test(value)) return false;
  if (/^weixin:\/\/dl\/chat\?$/i.test(value)) return false;
  if (/^viber:\/\/chat\?number=$/i.test(value)) return false;
  if (/^whatsapp:\/\/send\?phone=$/i.test(value)) return false;
  if (/^tg:\/\/resolve\?domain=$/i.test(value)) return false;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const path = (url.pathname.replace(/\/+$/, "") || "").toLowerCase();
      if (SOCIAL_PROFILE_HOSTS.has(host) && BARE_SOCIAL_PATHS.has(path)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function isCompleteReachValue(brand: string, value: string): boolean {
  const v = value.trim();
  if (!v || v === "@" || /^https?:\/\/$/i.test(v)) return false;
  if (brand === "bank") return isBankAccountComplete(parseBankAccount(v));
  if (usesChatLinkKinds(brand)) {
    const href = digitalCardSocialHref(brand, v);
    if (looksLikeShareUrl(v) || /^https?:\/\//i.test(v)) return isLiveReachHref(href);
    const kind = detectChatLinkKind(brand, v);
    if (kind === "group" || kind === "channel") return isLiveReachHref(href) || handle(v).length >= 6;
    if (kind === "username") return handle(v).length >= 2;
    return digits(v).length >= 7;
  }
  if (brand === "email" || brand === "zelle") {
    if (brand === "zelle") {
      if (v.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.includes("@");
      if (/^https?:\/\//i.test(v)) return isLiveReachHref(v);
      return digits(v).length >= 7;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  if (
    brand === "phone" ||
    brand === "viber" ||
    brand === "signal" ||
    brand === "momo" ||
    brand === "telecelcash" ||
    brand === "airteltigo" ||
    brand === "mpesa" ||
    brand === "gcash"
  ) {
    if (/^https?:\/\//i.test(v)) return isLiveReachHref(v);
    return digits(v).length >= 7;
  }
  if (brand === "website") return isLiveReachHref(websiteHref(v));
  if (brand === "location") return Boolean(parseCeleCardPlace(v)?.href);
  if (brand === "other") return isLiveReachHref(parseOtherLink(v).href);
  const href = digitalCardSocialHref(brand, v);
  if (!isLiveReachHref(href)) return false;
  if (isExactPageShare(brand, v, href) || looksLikeShareUrl(v)) return true;
  return extractReachHandle(brand, v).length > 0;
}

const BRAND_SHARE_HOSTS: Record<string, string[]> = {
  instagram: ["instagram.com", "instagr.am", "l.instagram.com"],
  tiktok: ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  x: ["x.com", "twitter.com", "mobile.twitter.com"],
  threads: ["threads.net"],
  facebook: ["facebook.com", "fb.com", "fb.watch", "l.facebook.com", "lm.facebook.com"],
  messenger: ["m.me"],
  linkedin: ["linkedin.com", "lnkd.in"],
  youtube: ["youtube.com", "youtu.be", "m.youtube.com", "music.youtube.com"],
  snapchat: ["snapchat.com"],
  pinterest: ["pinterest.com", "pin.it"],
  reddit: ["reddit.com"],
  discord: ["discord.com", "discord.gg"],
  bluesky: ["bsky.app"],
  trendshub: ["trendshub.live"],
  telegram: ["t.me", "telegram.me", "telegram.dog"],
  whatsapp: ["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "web.whatsapp.com", "whatsapp.com"],
  github: ["github.com"],
  twitch: ["twitch.tv"],
  spotify: ["open.spotify.com", "spotify.com"],
  applemusic: ["music.apple.com"],
  behance: ["behance.net"],
  dribbble: ["dribbble.com"],
  medium: ["medium.com"],
  signal: ["signal.me"],
  line: ["line.me"],
  viber: ["viber.com"],
  wechat: ["u.wechat.com"],
  paypal: ["paypal.me", "paypal.com"],
  cashapp: ["cash.app"],
  venmo: ["venmo.com"],
  revolut: ["revolut.me"],
  wise: ["wise.com"],
  chipper: ["chippercash.com"],
  alipay: ["qr.alipay.com"],
};

function articleFor(label: string) {
  return /^[aeioux]/i.test(label) ? "an" : "a";
}

function reachHostOf(value: string): string | null {
  const href = canonicalizeShareHref(value);
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function brandOwningHost(host: string): string | null {
  for (const [brand, hosts] of Object.entries(BRAND_SHARE_HOSTS)) {
    if (hosts.includes(host)) return brand;
  }
  return null;
}

function isDraftReachValue(brand: string, value: string): boolean {
  const v = value.trim();
  if (brand === "bank") {
    const account = parseBankAccount(v);
    return !account.bankName && !account.accountName && !account.accountNumber && !account.notes;
  }
  if (brand === "location") return v.length < 5;
  if (brand === "other") {
    const link = parseOtherLink(v);
    return !link.href && link.label.length < 2;
  }
  if (v.length < 2 || v === "@") return true;
  if (/^https?:\/{0,2}$/i.test(v) || /^www\.?$/i.test(v)) return true;
  if (/^https?:\/\/[^\s/]+$/i.test(v) && !/\.[a-z]{2,}$/i.test(v.replace(/\/$/, ""))) return true;
  if (brand === "email") return !v.includes("@") && v.length < 6;
  if (usesChatLinkKinds(brand)) {
    if (looksLikeShareUrl(v)) return false;
    if (/[a-z]/i.test(v) && v.length >= 2) return false;
    if (digits(v).length < 4) return true;
    return false;
  }
  if (
    brand === "phone" ||
    brand === "viber" ||
    brand === "signal" ||
    brand === "momo" ||
    brand === "telecelcash" ||
    brand === "airteltigo" ||
    brand === "mpesa" ||
    brand === "gcash"
  ) {
    if (!looksLikeShareUrl(v) && digits(v).length < 4) return true;
  }
  return false;
}

function isBrokenUrlAttempt(value: string): boolean {
  const v = value.trim();
  if (!/^https?:\/\//i.test(v) && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v) && !/^www\./i.test(v)) return false;
  if (isDraftReachValue("website", v)) return false;
  return canonicalizeShareHref(v) == null && !/^https?:\/\/[^\s]+$/i.test(v);
}

export type ReachReviewStatus = "empty" | "draft" | "ok" | "review";

export type ReachReview = {
  status: ReachReviewStatus;
  message: string | null;
};

export function reviewReachInput(
  brand: string,
  value: string,
  options?: { hasQr?: boolean }
): ReachReview {
  const v = value.trim();
  if (!v) {
    if (options?.hasQr) return { status: "ok", message: null };
    return { status: "empty", message: null };
  }
  const label = brandReachLabel(brand);
  const pay = isPayNetwork(brand);
  if (isDraftReachValue(brand, v)) return { status: "draft", message: null };
  if (isBrokenUrlAttempt(v)) {
    return {
      status: "review",
      message: pay
        ? `This ${label} payment link could not be read. Check it, then paste the full address.`
        : `This ${label} link could not be read. Check it, then paste the full address.`,
    };
  }
  if (brand === "location") {
    if (parseCeleCardPlace(v)) return { status: "ok", message: null };
    return {
      status: "review",
      message:
        "Paste a Google Maps, Amap, Apple Maps, or other map link. A street address works too.",
    };
  }
  if (brand === "other") {
    if (isLiveReachHref(parseOtherLink(v).href)) return { status: "ok", message: null };
    return {
      status: "review",
      message: "Paste the full page address. Add a short name so guests know what they are opening.",
    };
  }
  const host = reachHostOf(v);
  const owner = host ? brandOwningHost(host) : null;
  if (owner && owner !== brand && brand !== "website" && brand !== "other") {
    if (brand === "email") {
      return {
        status: "review",
        message: "This does not look like an email address. Check the address.",
      };
    }
    if (brand === "phone") {
      return {
        status: "review",
        message: "This does not look like a phone number. Check the number so guests can call the right line.",
      };
    }
    return {
      status: "review",
      message: pay
        ? `This does not look like ${articleFor(label)} ${label} payment link. Open the right page, copy the link, and paste it here.`
        : `This does not look like ${articleFor(label)} ${label} link. Open the right page, copy the share link, and paste it here.`,
    };
  }
  if (!isCompleteReachValue(brand, v)) {
    if (brand === "email") {
      return { status: "review", message: "This email does not look complete. Check the address." };
    }
    if (brand === "phone") {
      return {
        status: "review",
        message: "This number looks incomplete. Check it so guests can call the right line.",
      };
    }
    if (brand === "website") {
      return {
        status: "review",
        message: "This site link looks incomplete. Check the address and paste the full page.",
      };
    }
    if (brand === "bank") {
      return {
        status: "review",
        message: "Guests need the bank name, account name, and account number. Check this detail.",
      };
    }
    if (pay) {
      return {
        status: "review",
        message: `This ${label} payment detail looks incomplete. Check the number or payment link so guests can pay the right person.`,
      };
    }
    return {
      status: "review",
      message: `Guests cannot open this ${label} page yet. Check the username or share link.`,
    };
  }
  if (host && brand !== "website" && !(BRAND_SHARE_HOSTS[brand] ?? []).includes(host)) {
    return {
      status: "review",
      message: pay
        ? `Please check this ${label} payment link. Confirm it is the page guests should open.`
        : `Please check this ${label} link. Confirm it opens the right page before guests tap it.`,
    };
  }
  return { status: "ok", message: null };
}

export function collectCardEmails(card: { email?: string | null; socials?: DigitalCardSocials | null }): string[] {
  return collectTaggedEmails(card).map((item) => item.value);
}

export function collectCardPhones(card: { phone?: string | null; socials?: DigitalCardSocials | null }): string[] {
  return collectTaggedPhones(card).map((item) => item.value);
}

export function collectTaggedEmails(card: {
  email?: string | null;
  socials?: DigitalCardSocials | null;
}): Array<{ value: string; tag: ContactKindTag | null }> {
  return collectTaggedValues(card.email, socialValueList(card.socials?.emails), card.socials?.emailTags);
}

export function collectTaggedPhones(card: {
  phone?: string | null;
  socials?: DigitalCardSocials | null;
}): Array<{ value: string; tag: ContactKindTag | null }> {
  return collectTaggedValues(card.phone, socialValueList(card.socials?.phones), card.socials?.phoneTags);
}

export function compactAlignedTags(
  values: string[],
  tags?: Array<ContactKindTag | ""> | null
): Array<ContactKindTag | ""> {
  return values.flatMap((value, index) =>
    value.trim() ? [normalizeContactKindTag(tags?.[index]) ?? ""] : []
  );
}

export function compactAlignedChatKinds(
  values: string[],
  kinds?: Array<ChatLinkKind | ""> | null,
  brand?: string
): Array<ChatLinkKind | ""> {
  return values.flatMap((value, index) => {
    if (!value.trim()) return [];
    const stored = normalizeChatLinkKind(kinds?.[index]);
    return [stored || (brand ? detectChatLinkKind(brand, value) : "")];
  });
}

export function chatKindsForBrand(socials: DigitalCardSocials | null | undefined, brand: string): Array<ChatLinkKind | ""> {
  const values = socialValueList(socials?.[brand as DigitalCardSocialKey]);
  const stored = socials?.linkKinds?.[brand];
  if (!values.length) return [""];
  return values.map((value, index) => normalizeChatLinkKind(stored?.[index]) || detectChatLinkKind(brand, value));
}

export function chatKindsMapForSocials(
  socials: DigitalCardSocials | null | undefined
): Record<string, Array<ChatLinkKind | "">> {
  const out: Record<string, Array<ChatLinkKind | "">> = {};
  for (const brand of CHAT_KIND_BRANDS) {
    out[brand] = chatKindsForBrand(socials, brand);
  }
  return out;
}

export function compactChatLinkKindsFromForm(
  socials: Partial<Record<string, DigitalCardFieldValue | undefined>>,
  kinds?: Partial<Record<string, Array<ChatLinkKind | "">>> | null
): NonNullable<DigitalCardSocials["linkKinds"]> {
  const out: NonNullable<DigitalCardSocials["linkKinds"]> = {};
  for (const brand of CHAT_KIND_BRANDS) {
    out[brand] = compactAlignedChatKinds(socialValueList(socials[brand]), kinds?.[brand], brand);
  }
  return out;
}

function collectTaggedValues(
  primary: string | null | undefined,
  list: string[],
  tags: unknown
): Array<{ value: string; tag: ContactKindTag | null }> {
  const aligned = alignedContactTags(list, tags);
  const byValue = new Map<string, ContactKindTag | null>();
  list.forEach((value, index) => {
    const next = value.trim();
    if (!next) return;
    const key = next.toLowerCase();
    if (!byValue.has(key)) byValue.set(key, normalizeContactKindTag(aligned[index]));
  });
  return uniqueStrings([primary, ...list]).map((value) => ({
    value,
    tag: byValue.get(value.toLowerCase()) ?? null,
  }));
}

export function collectCardWebsites(card: {
  website?: string | null;
  socials?: DigitalCardSocials | null;
}): string[] {
  return uniqueStrings([
    card.website,
    ...socialValueList(card.socials?.website),
    ...socialValueList(card.socials?.websites),
  ]);
}

function websiteHrefFromValue(value: string): string {
  const t = value.trim();
  if (!t) return "";
  const exact = canonicalizeShareHref(t);
  if (exact) return exact;
  const host = t.replace(/^https?:\/\//i, "").replace(/^\/\//, "");
  if (!host || /^www\.?$/i.test(host)) return "";
  return `https://${host}`;
}

export function websiteHref(value: string): string {
  return websiteHrefFromValue(value);
}

function reachHint(key: DigitalCardSocialKey, value: string): string {
  const v = value.trim();
  const href = looksLikeShareUrl(v) ? digitalCardSocialHref(key, v) : "";
  if (href && /^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      const host = url.hostname.replace(/^www\./, "");
      const path = url.pathname.replace(/\/$/, "");
      const watch = url.searchParams.get("v");
      if (watch) return `${host}/watch?v=${watch}`;
      return path ? `${host}${path}` : host;
    } catch {
      return v;
    }
  }
  if (
    key === "whatsapp" ||
    key === "whatsappbusiness" ||
    key === "viber" ||
    key === "signal" ||
    key === "momo" ||
    key === "telecelcash" ||
    key === "airteltigo" ||
    key === "mpesa" ||
    key === "gcash" ||
    key === "zelle"
  ) {
    return v;
  }
  if (key === "website") return v.replace(/^https?:\/\//i, "").replace(/^www\./, "");
  if (key === "location") return parseCeleCardPlace(v)?.label ?? v;
  if (key === "other") {
    const link = parseOtherLink(v);
    return link.label || otherLinkHost(link.href) || v;
  }
  if (key === "bank") {
    const account = parseBankAccount(v);
    return account.accountName || account.accountNumber || account.bankName || "Bank account";
  }
  return v.startsWith("@") ? v : `@${handle(v)}`;
}

export type DigitalCardReachItem = {
  id: string;
  brand: string;
  title: string;
  subtitle: string | null;
  href: string;
  /** Custom scheme used on phones that have the app. */
  appHref?: string;
  /** Android Intent URL with a web fallback when the app is missing. */
  androidIntent?: string;
  /** Uploaded receive or add-friend QR for scan wallets and QR-share apps. */
  qrUrl?: string;
  /** Number, cashtag, or email to copy when the guest opens Pay. */
  copyValue?: string;
  /** Personal or business mark on mail and phone. */
  kindTag?: ContactKindTag | null;
  /** Number, username, group, or channel for WhatsApp and Telegram. */
  linkKind?: ChatLinkKind | null;
  surface: DigitalCardReachSurface;
  /** Present when the destination is withheld until a grant. */
  locked?: boolean;
  visibility?: "PUBLIC" | "CODE_PROTECTED" | "REQUEST_ACCESS";
};

export function isLiveReachItem(
  item: Pick<DigitalCardReachItem, "href" | "qrUrl" | "brand" | "copyValue" | "locked">
): boolean {
  if (item.locked) return true;
  if (item.brand === "bank") return isCompleteReachValue("bank", item.copyValue || "");
  if (item.brand === "meeting") return true;
  if (isPayNetwork(item.brand) && item.copyValue?.trim()) return true;
  return Boolean(item.qrUrl?.trim()) || isLiveReachHref(item.href);
}

export type DigitalCardReachGroup = {
  id: string;
  brand: string;
  surface: DigitalCardReachSurface;
  items: DigitalCardReachItem[];
};

const GROUP_NOUN: Record<string, { title: string; unit: string }> = {
  email: { title: "Mail", unit: "addresses" },
  phone: { title: "Call", unit: "numbers" },
  website: { title: "Website", unit: "sites" },
  location: { title: "Location", unit: "places" },
  other: { title: "Pages", unit: "pages" },
  meeting: { title: "Meetings", unit: "times" },
  whatsapp: { title: "WhatsApp", unit: "chats" },
  whatsappbusiness: { title: "WhatsApp Business", unit: "chats" },
  bank: { title: "Bank", unit: "accounts" },
};

export function brandReachLabel(brand: string): string {
  if (GROUP_NOUN[brand]) return GROUP_NOUN[brand].title;
  return DIGITAL_CARD_SOCIAL_NETWORKS.find((network) => network.key === brand)?.label ?? brand;
}

export function reachGroupCopy(group: DigitalCardReachGroup): { title: string; subtitle: string | null } {
  const { items, brand } = group;
  if (items.length === 1) {
    return { title: items[0].title, subtitle: items[0].subtitle };
  }
  const known = GROUP_NOUN[brand];
  const title = known?.title ?? brandReachLabel(brand);
  if (usesChatLinkKinds(brand)) {
    const subtitle = chatKindCountCopy(items);
    if (subtitle) return { title, subtitle };
  }
  const unit = known?.unit ?? (isPayNetwork(brand) ? "wallets" : "profiles");
  return { title, subtitle: `${items.length} ${unit}` };
}

function chatKindCountCopy(items: DigitalCardReachItem[]): string | null {
  const counts: Record<ChatLinkKind, number> = { number: 0, username: 0, group: 0, channel: 0 };
  for (const item of items) {
    if (item.linkKind) counts[item.linkKind] += 1;
  }
  const parts: string[] = [];
  if (counts.number) parts.push(counts.number === 1 ? "1 chat" : `${counts.number} chats`);
  if (counts.username) parts.push(counts.username === 1 ? "1 username" : `${counts.username} usernames`);
  if (counts.group) parts.push(counts.group === 1 ? "1 group" : `${counts.group} groups`);
  if (counts.channel) parts.push(counts.channel === 1 ? "1 channel" : `${counts.channel} channels`);
  return parts.length ? parts.join(", ") : null;
}

export function arrangeChatChoices(items: DigitalCardReachItem[]): Array<{
  id: string;
  label: string | null;
  items: DigitalCardReachItem[];
}> {
  const order: ChatLinkKind[] = ["number", "username", "group", "channel"];
  const kinds = new Set(items.map((item) => item.linkKind).filter(Boolean));
  const showHeaders = kinds.size > 1;
  const sections: Array<{ id: string; label: string | null; items: DigitalCardReachItem[] }> = [];
  for (const kind of order) {
    const slice = items.filter((item) => item.linkKind === kind);
    if (!slice.length) continue;
    const label =
      kind === "number"
        ? slice.length === 1
          ? "Chat"
          : "Chats"
        : kind === "username"
          ? slice.length === 1
            ? "Username"
            : "Usernames"
          : kind === "group"
            ? slice.length === 1
              ? "Group"
              : "Groups"
            : slice.length === 1
              ? "Channel"
              : "Channels";
    sections.push({ id: kind, label: showHeaders ? label : null, items: slice });
  }
  const rest = items.filter((item) => !item.linkKind);
  if (rest.length) sections.push({ id: "more", label: showHeaders ? "More" : null, items: rest });
  return sections.length ? sections : [{ id: "all", label: null, items }];
}

export function reachChoiceLabel(item: DigitalCardReachItem): string {
  if (item.brand === "email" || item.brand === "phone" || item.brand === "website" || item.brand === "other") {
    return item.title;
  }
  return item.subtitle?.replace(/^@/, "") ? item.subtitle : item.title;
}

export function reachAccountPreview(item: DigitalCardReachItem): {
  title: string;
  hint: string | null;
  monogram: string;
} {
  if (item.locked) {
    return {
      title: item.title,
      hint: item.subtitle || (item.visibility === "CODE_PROTECTED" ? "Needs a code" : "Request access"),
      monogram: "••",
    };
  }
  if (item.linkKind) {
    const label = chatLinkKindLabel(item.linkKind) ?? "Chat";
    let ident = item.copyValue || item.subtitle || "";
    if (item.linkKind === "group" || item.linkKind === "channel") {
      try {
        const url = new URL(item.href);
        ident = url.pathname.split("/").filter(Boolean).pop() || ident;
      } catch {
        ident = ident.replace(/^https?:\/\//i, "");
      }
    }
    if (item.linkKind === "username" && ident && !ident.startsWith("@") && !looksLikeShareUrl(ident)) {
      ident = `@${handle(ident)}`;
    }
    const seed = (ident || label).replace(/^@/, "").replace(/[^a-zA-Z0-9]/g, "");
    return {
      title: ident || label,
      hint: label,
      monogram: (seed.slice(0, 2) || label.slice(0, 1)).toUpperCase(),
    };
  }
  const title = reachChoiceLabel(item);
  const kind = contactKindLabel(item.kindTag);
  let hint = kind;
  if (!hint && item.href) {
    try {
      const url = new URL(item.href);
      const host = url.hostname.replace(/^www\./, "");
      const path = url.pathname.replace(/\/$/, "");
      if (host && !host.startsWith("mailto") && host !== "tel") {
        hint = path ? `${host}${path}` : host;
      }
    } catch {
      hint = null;
    }
  }
  if (!hint) hint = item.subtitle && item.subtitle !== title ? item.subtitle : brandReachLabel(item.brand);
  const seed = title.replace(/^@/, "").replace(/[^a-zA-Z0-9]/g, "");
  const monogram = (seed.slice(0, 2) || brandReachLabel(item.brand).slice(0, 1)).toUpperCase();
  return { title, hint, monogram };
}

export function collapseReachGroups(groups: DigitalCardReachGroup[]): DigitalCardReachGroup[] {
  const map = new Map<string, DigitalCardReachGroup>();
  const order: string[] = [];
  for (const group of groups) {
    const key = `${group.surface}:${group.brand}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...group, items: uniqueReachChoices(group.items) });
      order.push(key);
      continue;
    }
    existing.items = uniqueReachChoices([...existing.items, ...group.items]);
  }
  return order.map((key) => map.get(key)!);
}

function uniqueReachChoices(items: DigitalCardReachItem[]): DigitalCardReachItem[] {
  const seen = new Set<string>();
  const out: DigitalCardReachItem[] = [];
  for (const item of items) {
    const key = item.locked
      ? `${item.brand}:locked:${item.id}`
      : `${item.brand}:${(item.href || item.qrUrl || item.copyValue || item.id).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function groupReachByBrand(items: DigitalCardReachItem[]): DigitalCardReachGroup[] {
  const live = items.filter((item) => isLiveReachItem(item));
  const buckets = new Map<string, DigitalCardReachItem[]>();
  const order: string[] = [];
  for (const item of live) {
    const key = `${item.surface}:${item.brand}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }
  return collapseReachGroups(
    order.map((key) => {
      const grouped = buckets.get(key)!;
      return {
        id: key,
        brand: grouped[0].brand,
        surface: grouped[0].surface,
        items: grouped,
      };
    })
  );
}

export function arrangeReachItems(
  items: DigitalCardReachItem[],
  stackOrder?: string[],
  dockOrder?: string[]
): DigitalCardReachItem[] {
  const live = items.filter((item) => isLiveReachItem(item));
  const placed = new Set<string>();

  function take(ids: string[] | undefined, surface: DigitalCardReachSurface) {
    const out: DigitalCardReachItem[] = [];
    for (const id of ids ?? []) {
      const item = live.find((entry) => entry.id === id);
      if (!item || placed.has(id)) continue;
      placed.add(id);
      out.push({ ...item, surface });
    }
    return out;
  }

  const stack = take(stackOrder, "stack");
  const dock = take(dockOrder, "dock");
  for (const item of live) {
    if (placed.has(item.id)) continue;
    const surface = item.surface || defaultReachSurface(item.brand);
    if (surface === "stack") stack.push({ ...item, surface: "stack" });
    else dock.push({ ...item, surface: "dock" });
  }
  return [...stack, ...dock];
}

export function listDigitalCardReachItems(card: {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socials: DigitalCardSocials;
}): DigitalCardReachItem[] {
  const items: DigitalCardReachItem[] = [];
  const emails = collectTaggedEmails(card);
  const phones = collectTaggedPhones(card);
  const callingCode = callingCodeFromPhones(phones.map((entry) => entry.value));
  emails.forEach((entry, index) => {
    if (!isCompleteReachValue("email", entry.value)) return;
    items.push({
      id: `email-${index}`,
      brand: "email",
      title: entry.value,
      subtitle: contactKindLabel(entry.tag) ?? "Mail",
      href: `mailto:${entry.value}`,
      kindTag: entry.tag,
      surface: "stack",
    });
  });
  phones.forEach((entry, index) => {
    if (!isCompleteReachValue("phone", entry.value)) return;
    items.push({
      id: `phone-${index}`,
      brand: "phone",
      title: displayPhone(entry.value) || entry.value,
      subtitle: contactKindLabel(entry.tag) ?? "Call",
      href: internationalTelHref(entry.value, callingCode),
      kindTag: entry.tag,
      surface: "stack",
    });
  });
  collectCardWebsites(card).forEach((site, index) => {
    if (!isCompleteReachValue("website", site)) return;
    items.push({
      id: `website-${index}`,
      brand: "website",
      title: reachHint("website", site),
      subtitle: index === 0 ? "Website" : "Site",
      href: websiteHref(site),
      surface: "stack",
    });
  });
  const meeting = persistMeetingDesk(card.socials.meeting) ?? compactMeetingDesk(card.socials.meeting);
  if (meeting?.enabled) {
    items.push({
      id: "meeting-0",
      brand: "meeting",
      title: meeting.title,
      subtitle: meetingSubtitle(meeting),
      href: "",
      copyValue: JSON.stringify(meeting),
      surface: "stack",
    });
  }
  const business = persistBusinessProfile(card.socials.business);
  if (business?.enabled && (business.hours || business.services.length)) {
    items.push({
      id: "business-0",
      brand: "other",
      title: business.services[0] || "Business hours",
      subtitle: business.hours || business.services.slice(1).join(" · ") || "Services",
      href: "",
      copyValue: [business.hours, ...business.services].filter(Boolean).join(" · "),
      surface: "stack",
    });
  }
  for (const network of DIGITAL_CARD_SOCIAL_NETWORKS) {
    if (network.key === "website") continue;
    const pay = isPayNetwork(network.key);
    const values = pay || networkAcceptsQr(network.key)
      ? slottedFieldValues(card.socials[network.key])
      : socialValueList(card.socials[network.key]);
    const qrMax = networkAcceptsQr(network.key) ? qrSlotMax(card.socials.payQr, network.key) : 0;
    const max = Math.max(values.length, qrMax);
    let liveIndex = 0;
    for (let index = 0; index < max; index += 1) {
      const value = (values[index] ?? "").trim();
      const qrUrl = network.key === "bank" ? "" : card.socials.payQr?.[`${network.key}-${index}`]?.trim() || "";
      const href = value ? digitalCardSocialHref(network.key, value) : "";
      const bank = network.key === "bank" ? parseBankAccount(value) : null;
      const complete = network.key === "bank"
        ? Boolean(bank && isBankAccountComplete(bank))
        : Boolean(value) &&
          isCompleteReachValue(network.key, value) &&
          (href ? isLiveReachHref(href) : isPayNetwork(network.key));
      if (!complete && !qrUrl) continue;
      const place = network.key === "location" ? parseCeleCardPlace(value) : null;
      const other = network.key === "other" ? parseOtherLink(value) : null;
      const linkKind = usesChatLinkKinds(network.key)
        ? normalizeChatLinkKind(card.socials.linkKinds?.[network.key]?.[index]) || detectChatLinkKind(network.key, value)
        : null;
      items.push({
        id: `${network.key}-${liveIndex}`,
        brand: network.key,
        title: bank ? bank.bankName : place ? place.label : other?.label || network.label,
        subtitle: bank
          ? [bank.accountName, bankAccountTypeLabel(bank.accountType)].filter(Boolean).join(" · ") || "Bank account"
          : place
            ? place.provider
          : other
            ? otherLinkHost(other.href) || "Page"
          : value
            ? reachHint(network.key, value)
            : qrUrl
              ? isPayNetwork(network.key)
                ? "Scan to pay"
                : "Scan to add"
              : null,
        href: complete && network.key !== "bank" ? href : "",
        qrUrl: qrUrl || undefined,
        copyValue: bank ? serializeBankAccount(bank) : value || undefined,
        linkKind,
        ...(complete && network.key !== "bank" ? nativeOpenFor(network.key, value, href) : {}),
        surface: defaultReachSurface(network.key),
      });
      liveIndex += 1;
    }
  }
  return arrangeReachItems(items, card.socials.stackOrder, card.socials.dockOrder);
}

export function isPayReachItem(item: Pick<DigitalCardReachItem, "brand">): boolean {
  return isPayNetwork(item.brand);
}

export type DigitalCardPayFamilyId = (typeof DIGITAL_CARD_PAY_FAMILIES)[number]["id"];

export type DigitalCardPayFamilyGroup = {
  id: DigitalCardPayFamilyId;
  label: string;
  items: DigitalCardReachItem[];
};

/** Guest Wallet card. Uploaded payment channels only. Access codes still apply. */
export function listDigitalCardPayItems(card: {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socials?: DigitalCardSocials | null;
  guestReach?: DigitalCardReachItem[] | null;
}): DigitalCardReachItem[] {
  const source = Array.isArray(card.guestReach)
    ? card.guestReach
    : listDigitalCardReachItems({
        email: card.email,
        phone: card.phone,
        website: card.website,
        socials: card.socials ?? {},
      });
  return source.filter(isPayReachItem);
}

export function groupDigitalCardPayItems(items: DigitalCardReachItem[]): DigitalCardPayFamilyGroup[] {
  return DIGITAL_CARD_PAY_FAMILIES.map((family) => ({
    id: family.id,
    label: family.label,
    items: items.filter((item) => (family.keys as readonly string[]).includes(item.brand)),
  })).filter((group) => group.items.length > 0);
}

const PHONE_LIKE = new Set<DigitalCardSocialKey>([
  "whatsapp",
  "whatsappbusiness",
  "viber",
  "signal",
  "momo",
  "telecelcash",
  "airteltigo",
  "mpesa",
  "gcash",
]);

const fieldValueSchema = (max: number) =>
  z.union([z.string().max(max), z.array(z.string().max(max)).max(DIGITAL_CARD_REACH_MAX)]);

export const digitalCardSocialsSchema = z
  .object({
    ...(Object.fromEntries(
      DIGITAL_CARD_SOCIAL_KEYS.map((key) => [
        key,
        fieldValueSchema(
          key === "other" ? 800 : PHONE_LIKE.has(key) && !usesChatLinkKinds(key) ? 80 : 500
        ).optional(),
      ])
    ) as Record<DigitalCardSocialKey, z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString>]>>>),
    emails: z.array(z.string().max(120)).max(DIGITAL_CARD_REACH_MAX).optional(),
    phones: z.array(z.string().max(40)).max(DIGITAL_CARD_REACH_MAX).optional(),
    websites: z.array(z.string().max(300)).max(DIGITAL_CARD_REACH_MAX).optional(),
    emailTags: z.array(z.string().max(20)).max(DIGITAL_CARD_REACH_MAX).optional(),
    phoneTags: z.array(z.string().max(20)).max(DIGITAL_CARD_REACH_MAX).optional(),
    linkKinds: z.record(z.array(z.string().max(20)).max(DIGITAL_CARD_REACH_MAX)).optional(),
    pronouns: z.string().max(40).optional(),
    payQr: z.record(z.string().max(2000)).optional(),
    stackOrder: z.array(z.string().max(80)).max(40).optional(),
    dockOrder: z.array(z.string().max(80)).max(40).optional(),
    reachVisibility: z
      .record(z.enum(["PUBLIC", "CODE_PROTECTED", "REQUEST_ACCESS"]))
      .optional(),
    portraitFrame: z.enum(["circle", "square", "rounded", "arch"]).optional(),
    companyLogoUrl: z.string().max(2000).optional(),
    meeting: z
      .object({
        enabled: z.boolean().optional(),
        title: z.string().max(80).optional(),
        durationMin: z.number().int().optional(),
        timezone: z.string().max(60).optional(),
        weekdays: z.array(z.number().int()).max(7).optional(),
        startHour: z.number().int().optional(),
        endHour: z.number().int().optional(),
        bufferMin: z.number().int().optional(),
        noticeHours: z.number().int().optional(),
        horizonDays: z.number().int().optional(),
        place: z.string().max(40).optional(),
        note: z.string().max(160).optional(),
      })
      .optional(),
    business: z
      .object({
        enabled: z.boolean().optional(),
        hours: z.string().max(80).optional(),
        services: z.array(z.string().max(40)).max(6).optional(),
      })
      .optional(),
    design: z
      .object({
        composition: z.enum(["classic", "portrait-led", "type-first", "media-first", "grid", "iconic"]).optional(),
        atmosphere: z.string().max(40).optional(),
        ornament: z
          .enum([
            "none",
            "foil",
            "double",
            "filigree",
            "bead",
            "inset",
            "ribbon",
            "halftone",
            "wave",
            "grid",
            "marquee",
            "cel",
            "crest",
            "kente",
            "sunburst",
            "neon",
          ])
          .optional(),
        paperUrl: z.string().max(2000).optional(),
        paperWeight: z.enum(["subtle", "balanced", "rich"]).optional(),
        paperTone: z.enum(["light", "dark"]).optional(),
        nameScale: z.enum(["quiet", "balanced", "statement"]).optional(),
        faceLead: z.enum(["photo", "name", "code"]).optional(),
        lettering: z.enum(["letterhead", "credit", "stamp", "neon", "masthead", "carved", "script", "mono"]).optional(),
        ink: z.enum(["light", "dark"]).optional(),
        accent: z.enum(["teal", "gold", "ivory", "rose", "sky", "ink", "copper", "emerald", "wine", "sand"]).optional(),
        qrFinish: z.enum(["foil", "quiet", "inset", "stamp"]).optional(),
        grain: z.enum(["paper", "linen", "silk", "speckle", "canvas", "none"]).optional(),
        motion: z.enum(["atelier", "cinema", "pulse", "earth", "linen", "still", "spotlight"]).optional(),
      })
      .optional(),
  })
  .partial()
  .optional();
