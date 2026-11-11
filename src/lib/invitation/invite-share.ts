import { copyText } from "@/lib/clipboard";
import { resolveDeceasedName } from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InviteCategory } from "@/lib/invite-blueprints/blueprint-types";
import type { InvitationEventData } from "@/types/invitation-design";
import { resolveSocialEventKind } from "@/lib/social/social-category";
import { socialNativeShareText } from "@/lib/social/social-copy";
import { resolveSocialEventTitle } from "@/lib/social/social-event-title";
import { sanitizeSocialGuestDisplayName } from "@/lib/social/social-guest";
import { guestFacingInviteLink } from "@/lib/invitation/public-invite-alias";
import { buildInvitationShareLetter, ensureSingleShareUrl } from "@/lib/invitation/whatsapp-share";

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
  const link = guestFacingInviteLink(input.uniqueLink?.trim() || "");
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
  admissionCode?: string | null;
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

  const guestDisplayName = sanitizeSocialGuestDisplayName(input.guestDisplayName);
  const letter = guestDisplayName
    ? buildInvitationShareLetter({
        title,
        guestName: guestDisplayName,
        admissionCode: input.admissionCode,
        memorial: kind === "funeral",
      })
    : socialNativeShareText({
        kind,
        title,
        guestDisplayName,
      });

  return {
    title,
    text: letter,
    url,
  };
}

export function inviteShareClipboardPlain(payload: InviteSharePayload): string {
  return ensureSingleShareUrl(payload.text, payload.url);
}

export function socialPlaceCardUrlFromInviteUrl(inviteUrl: string): string | null {
  try {
    const parsed = new URL(inviteUrl);
    const match = parsed.pathname.match(/\/invite\/([^/]+)\/?$/);
    if (!match?.[1]) return null;
    const image = new URL(`/api/social/invite/${match[1]}/image`, parsed.origin);
    const guest = parsed.searchParams.get("guest");
    if (guest) image.searchParams.set("guest", guest);
    return image.toString();
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inviteShareClipboardHtml(
  payload: InviteSharePayload,
  imageUrl?: string | null
): string {
  const title = escapeHtml(payload.title);
  const body = escapeHtml(payload.text).replace(/\r?\n/g, "<br/>");
  const url = escapeHtml(payload.url);
  const photo = imageUrl?.trim()
    ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" width="600" style="width:100%;max-width:600px;height:auto;border-radius:12px;display:block;margin:0 0 16px;" />`
    : "";
  return `<div style="font-family:Georgia,serif;color:#1C1915;max-width:600px">${photo}<p style="margin:0 0 12px;font-size:18px;font-weight:600;">${title}</p><p style="margin:0 0 12px;line-height:1.45;">${body}</p><p style="margin:0;"><a href="${url}">${url}</a></p></div>`;
}

async function fetchShareImageBlob(imageUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(imageUrl, { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size < 32) return null;
    return blob;
  } catch {
    return null;
  }
}

async function shareImageFile(imageUrl: string): Promise<File | null> {
  const blob = await fetchShareImageBlob(imageUrl);
  if (!blob) return null;
  const type = blob.type || "image/jpeg";
  const ext = type.includes("png") ? "png" : "jpg";
  return new File([blob], `invitation.${ext}`, { type });
}

export async function tryNativeInviteShare(
  payload: InviteSharePayload,
  options?: { imageUrl?: string | null }
): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unavailable";
  }

  const imageUrl = options?.imageUrl?.trim() || socialPlaceCardUrlFromInviteUrl(payload.url);
  const file = imageUrl ? await shareImageFile(imageUrl) : null;
  const withFile: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
    files: file ? [file] : undefined,
  };
  const data: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };

  try {
    if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share(withFile);
      return "shared";
    }
    if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
      const urlOnly: ShareData = { title: payload.title, url: payload.url };
      if (!navigator.canShare(urlOnly)) return "unavailable";
      await navigator.share(urlOnly);
      return "shared";
    }
    await navigator.share(data);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
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
  const fullMessage = ensureSingleShareUrl(payload.text, payload.url);
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
      return `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(fullMessage)}`;
  }
}

export async function copyInviteShareLink(
  input: string | InviteSharePayload,
  options?: { imageUrl?: string | null }
): Promise<boolean> {
  if (typeof input === "string") {
    return copyText(input);
  }

  const imageUrl = options?.imageUrl?.trim() || socialPlaceCardUrlFromInviteUrl(input.url);
  const plain = inviteShareClipboardPlain(input);
  const html = inviteShareClipboardHtml(input, imageUrl);

  if (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    const imageBlob = imageUrl ? await fetchShareImageBlob(imageUrl) : null;
    try {
      const rich: Record<string, Blob> = {
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      };
      if (imageBlob) rich[imageBlob.type || "image/jpeg"] = imageBlob;
      await navigator.clipboard.write([new ClipboardItem(rich)]);
      return true;
    } catch {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([plain], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
        return true;
      } catch {
        /* fall through to plain text */
      }
    }
  }

  return copyText(plain);
}
