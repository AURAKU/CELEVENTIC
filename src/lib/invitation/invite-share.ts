import { copyText } from "@/lib/clipboard";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InviteCategory } from "@/lib/invite-blueprints/blueprint-types";
import type { InvitationEventData } from "@/types/invitation-design";

export type InviteSharePayload = {
  title: string;
  text: string;
  url: string;
};

export type InviteShareChannel =
  | "native"
  | "whatsapp"
  | "sms"
  | "telegram"
  | "facebook"
  | "x"
  | "email"
  | "copy";

/** Canonical public invite URL (no hash / guest query noise). */
export function resolveInviteShareUrl(input: {
  uniqueLink?: string | null;
  origin?: string;
  fallbackHref?: string;
}): string {
  const origin =
    input.origin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const link = input.uniqueLink?.trim();
  if (origin && link) {
    return `${origin}/invite/${encodeURIComponent(link)}`;
  }
  if (input.fallbackHref) {
    try {
      const u = new URL(input.fallbackHref, origin || "https://celeventic.com");
      u.hash = "";
      // Keep guest token if present — personalised invites should stay personal.
      return u.toString();
    } catch {
      return input.fallbackHref.split("#")[0] || input.fallbackHref;
    }
  }
  return origin || "";
}

export function buildInviteSharePayload(input: {
  category: InviteCategory;
  event: InvitationEventData;
  uniqueLink?: string | null;
  origin?: string;
  fallbackHref?: string;
}): InviteSharePayload {
  const url = resolveInviteShareUrl({
    uniqueLink: input.uniqueLink,
    origin: input.origin,
    fallbackHref: input.fallbackHref,
  });

  if (input.category === "funeral") {
    const name = resolveDeceasedName(input.event);
    return {
      title: `In loving memory of ${name}`,
      text: `You're invited to the memorial service for ${name}. Open the invitation:`,
      url,
    };
  }

  return {
    title: input.event.title,
    text: `You're invited — ${input.event.title}. Open the invitation:`,
    url,
  };
}

export async function tryNativeInviteShare(
  payload: InviteSharePayload
): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unavailable";
  }

  const data: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };

  try {
    if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
      // Some browsers reject url+text together — retry url-only.
      const urlOnly: ShareData = { title: payload.title, url: payload.url };
      if (!navigator.canShare(urlOnly)) return "unavailable";
      await navigator.share(urlOnly);
      return "shared";
    }
    await navigator.share(data);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    // Retry leaner payload once (iOS Safari quirks).
    try {
      await navigator.share({ title: payload.title, url: payload.url });
      return "shared";
    } catch (retryError) {
      if (retryError instanceof DOMException && retryError.name === "AbortError") {
        return "cancelled";
      }
      return "unavailable";
    }
  }
}

export function buildInviteShareChannelHref(
  channel: Exclude<InviteShareChannel, "native" | "copy">,
  payload: InviteSharePayload
): string {
  const fullMessage = `${payload.text}\n${payload.url}`;
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
    case "sms":
      // iOS uses &body=, Android often uses ?body=
      return `sms:?&body=${encodeURIComponent(fullMessage)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(`${payload.text}\n\n${payload.url}`)}`;
  }
}

export async function copyInviteShareLink(url: string): Promise<boolean> {
  return copyText(url);
}
