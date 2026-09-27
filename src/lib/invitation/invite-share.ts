import { copyText } from "@/lib/clipboard";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InviteCategory } from "@/lib/invite-blueprints/blueprint-types";
import type { InvitationEventData } from "@/types/invitation-design";
import { resolveSocialEventKind } from "@/lib/social/social-category";
import { socialNativeShareText } from "@/lib/social/social-copy";
import { resolveSocialEventTitle } from "@/lib/social/social-event-title";

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

/** Canonical public invite URL. Personalized links keep `?guest=`. */
export function resolveInviteShareUrl(input: {
  uniqueLink?: string | null;
  origin?: string;
  fallbackHref?: string;
  guestToken?: string | null;
}): string {
  const origin =
    input.origin?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const link = input.uniqueLink?.trim();
  const guest = input.guestToken?.trim();
  if (origin && link) {
    const base = `${origin}/invite/${encodeURIComponent(link)}`;
    return guest ? `${base}?guest=${encodeURIComponent(guest)}` : base;
  }
  if (input.fallbackHref) {
    try {
      const u = new URL(input.fallbackHref, origin || "https://celeventic.com");
      u.hash = "";
      if (guest) u.searchParams.set("guest", guest);
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
  catalogSlug?: string | null;
  layoutSlug?: string | null;
  invitationName?: string | null;
  partnerOneName?: string | null;
  partnerTwoName?: string | null;
  guestDisplayName?: string | null;
  guestToken?: string | null;
  eventType?: string | null;
}): InviteSharePayload {
  const url = resolveInviteShareUrl({
    uniqueLink: input.uniqueLink,
    origin: input.origin,
    fallbackHref: input.fallbackHref,
    guestToken: input.guestToken,
  });
  const kind =
    input.category === "funeral"
      ? "funeral"
      : resolveSocialEventKind({
          catalogSlug: input.catalogSlug,
          layoutSlug: input.layoutSlug,
          eventType: input.eventType,
        });
  const deceasedName =
    kind === "funeral" ? resolveDeceasedName(input.event, input.invitationName) : input.event.deceasedName;
  const title = resolveSocialEventTitle({
    eventTitle: input.event.title,
    hostName: input.event.hostName,
    invitationName: input.invitationName,
    partnerOneName: input.partnerOneName,
    partnerTwoName: input.partnerTwoName,
    deceasedName,
    kind,
  }).title;

  return {
    title,
    text: socialNativeShareText({
      kind,
      title,
      guestDisplayName: input.guestDisplayName,
    }),
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
