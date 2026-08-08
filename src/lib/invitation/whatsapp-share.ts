/**
 * WhatsApp share helpers — one link in the message, one open per tap.
 *
 * Hosts were seeing duplicate invites because (a) share copy sometimes
 * concatenated the invite URL twice and (b) a second click / nested
 * Button+anchor could open WhatsApp twice before the first tab focused.
 */

const OPEN_COOLDOWN_MS = 1200;
let lastOpenAt = 0;
let lastOpenKey = "";

/** Digits only, no leading +. Empty string = open chooser (no prefilled contact). */
export function normalizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D+/g, "");
}

/**
 * Collapse accidental double-absolute URLs produced by concatenating appUrl
 * onto an already-absolute share link.
 */
export function collapseDuplicateAbsoluteUrl(url: string): string {
  let trimmed = url.trim();

  // https://host/https://host/invite/...  (concat bug)
  for (let i = 0; i < 3; i++) {
    const nested = trimmed.match(/^(https?:\/\/[^/\s]+)\/(https?:\/\/\S+)/i);
    if (!nested) break;
    trimmed = nested[2].replace(/[),.;]+$/g, "");
  }

  const match = trimmed.match(/https?:\/\/\S+/gi);
  if (!match || match.length <= 1) return trimmed.replace(/[),.;]+$/g, "");

  const inviteLike = [...match].reverse().find((u) => /\/invite\/|\/vendor-pass\/|\/qr\//i.test(u));
  if (inviteLike) return inviteLike.replace(/[),.;]+$/g, "");

  return match[match.length - 1].replace(/[),.;]+$/g, "");
}

/** Ensure `text` mentions `url` at most once (append if missing). */
export function ensureSingleShareUrl(text: string, url: string): string {
  const cleanUrl = collapseDuplicateAbsoluteUrl(url);
  const withoutUrls = text.replace(/https?:\/\/[^\s]+/gi, "").replace(/[ \t]+\n/g, "\n").trim();
  if (!cleanUrl) return withoutUrls;
  if (!withoutUrls) return cleanUrl;
  return `${withoutUrls}\n\n${cleanUrl}`;
}

export function buildInviteWhatsAppText(params: {
  guestName: string;
  inviteUrl: string;
  admissionCode?: string | null;
  eventTitle?: string | null;
}): string {
  const url = collapseDuplicateAbsoluteUrl(params.inviteUrl);
  const lines = [
    `Dear ${params.guestName},`,
    "",
    params.eventTitle
      ? `You are personally invited to ${params.eventTitle}.`
      : "You are personally invited.",
    "",
    "Open your invitation:",
    url,
  ];
  if (params.admissionCode) {
    lines.push("", `Your admission code: ${params.admissionCode}`);
  }
  return ensureSingleShareUrl(lines.join("\n"), url);
}

export function buildWhatsAppHref(text: string, phone?: string | null): string {
  const digits = normalizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Open WhatsApp once per gesture. Ignores rapid re-fires with the same payload
 * (double-tap, Strict Mode quirks, nested button+anchor).
 */
export function openWhatsAppShare(text: string, phone?: string | null): boolean {
  const href = buildWhatsAppHref(text, phone);
  const now = Date.now();
  if (href === lastOpenKey && now - lastOpenAt < OPEN_COOLDOWN_MS) {
    return false;
  }
  lastOpenKey = href;
  lastOpenAt = now;

  if (typeof window === "undefined") return false;
  window.open(href, "_blank", "noopener,noreferrer");
  return true;
}

/** Test helper — resets the open cooldown. */
export function resetWhatsAppShareGuardForTests() {
  lastOpenAt = 0;
  lastOpenKey = "";
}
