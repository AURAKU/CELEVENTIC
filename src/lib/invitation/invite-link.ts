/**
 * Public invitation link normalisation.
 *
 * `Invitation.uniqueLink` is a bearer token minted as `A-Za-z0-9` (legacy) or
 * base64url `A-Za-z0-9_-` (imports / general passes). Guests almost never type
 * it — they tap a link that has been through WhatsApp, SMS, email clients,
 * QR scanners and clipboard managers first. Those carriers routinely add:
 *
 *   - percent-encoding (`%20`, or a double-encoded `%2520`)
 *   - a wrapping `<https://…>` (RFC 3986 angle brackets in mail clients)
 *   - a trailing slash, or the whole `https://host/invite/<token>` URL
 *   - trailing sentence punctuation when the link was pasted into a message
 *   - zero-width / non-breaking whitespace from rich-text editors
 *
 * Production served those links from a database whose rows matched by chance
 * of a clean paste; the exact-match-only lookup 404'd everything else. These
 * helpers make the *lookup* forgiving without making the *token* weaker: the
 * untouched value is always tried first, and every fallback is an explicit,
 * ordered candidate rather than a fuzzy query.
 *
 * Client-safe: no Prisma, no Node built-ins.
 */

/** Zero-width and BOM characters that survive copy/paste from rich text. */
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Non-breaking spaces normalise to plain spaces before whitespace removal. */
const NBSP_CHARS = /[\u00A0\u2007\u202F]/g;

/** Wrapping characters mail/chat clients add around a pasted URL. */
const LEADING_WRAPPERS = /^[<(\[{"'`«“‘]+/;
const TRAILING_WRAPPERS = /[>)\]}"'`»”’]+$/;

/** Sentence punctuation glued to the end of a pasted link. Never `-` or `_`. */
const TRAILING_SENTENCE_PUNCTUATION = /[.,;:!?]+$/;

/** Tokens are URL-safe base64 / alphanumeric — nothing else is a real link. */
const PLAUSIBLE_TOKEN = /^[A-Za-z0-9_-]{6,128}$/;

/**
 * `decodeURIComponent` that never throws and never loops forever.
 *
 * WhatsApp and some CRM senders double-encode, so decode until the value is
 * stable (max 3 passes). A malformed sequence keeps the last good value.
 */
export function safeDecodeURIComponent(value: string): string {
  let current = value;
  for (let pass = 0; pass < 3; pass += 1) {
    if (!current.includes("%")) return current;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return current;
    }
    if (decoded === current) return current;
    current = decoded;
  }
  return current;
}

/**
 * Pull the invite token out of a full URL / path form.
 *
 * A raw token can never contain `/`, so anything with a slash is a URL or a
 * path (including the trailing-slash case) and is reduced to its token
 * segment. `/invite/<token>/event-day` resolves to `<token>`.
 */
function extractLinkSegment(value: string): string {
  if (!value.includes("/")) return value;

  const inviteIndex = value.lastIndexOf("/invite/");
  let rest = inviteIndex >= 0 ? value.slice(inviteIndex + "/invite/".length) : value;

  // Query / fragment never belong to the token.
  rest = rest.split("#")[0].split("?")[0];

  const segments = rest.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  if (inviteIndex >= 0) return segments[0];

  // No `/invite/` marker: an absolute URL contributes its last segment
  // (host + path), a bare `token/` contributes its first.
  return value.includes("://") ? segments[segments.length - 1] : segments[0];
}

/**
 * Canonical form of a guest-supplied invitation link.
 *
 * Idempotent: `normalizeInviteLink(normalizeInviteLink(x)) === normalizeInviteLink(x)`.
 * Returns `""` when nothing usable remains — callers must treat that as
 * "not found" rather than querying with an empty token.
 */
export function normalizeInviteLink(raw: string | null | undefined): string {
  if (raw == null) return "";

  let value = String(raw);
  if (!value) return "";

  value = value.replace(INVISIBLE_CHARS, "").replace(NBSP_CHARS, " ").trim();
  if (!value) return "";

  value = value.replace(LEADING_WRAPPERS, "").replace(TRAILING_WRAPPERS, "");

  value = safeDecodeURIComponent(value);
  // Decoding can re-introduce whitespace / wrappers (`%20`, `%3C`).
  value = value
    .replace(INVISIBLE_CHARS, "")
    .replace(NBSP_CHARS, " ")
    .trim()
    .replace(LEADING_WRAPPERS, "")
    .replace(TRAILING_WRAPPERS, "");

  value = extractLinkSegment(value);

  // Tokens never contain whitespace; collapsing to nothing recovers links
  // that were line-wrapped by an email client.
  value = value.replace(/\s+/g, "");

  return value.trim();
}

/** Whether a value looks like a real invite token (used to gate fuzzy fallbacks). */
export function isPlausibleInviteToken(value: string | null | undefined): boolean {
  if (!value) return false;
  return PLAUSIBLE_TOKEN.test(value);
}

/**
 * Ordered, de-duplicated lookup candidates — **exact first, always**.
 *
 * Index 0 is the untouched caller value so a case-sensitive token that
 * legitimately differs from its normalised form can never be shadowed by a
 * more permissive variant.
 */
export function inviteLinkCandidates(raw: string | null | undefined): string[] {
  const candidates: string[] = [];
  const push = (value: string | null | undefined) => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return;
    if (candidates.includes(trimmed)) return;
    candidates.push(trimmed);
  };

  const original = raw == null ? "" : String(raw);
  push(original);

  const normalized = normalizeInviteLink(original);
  push(normalized);

  // Last resort: a link pasted mid-sentence ("…/invite/abc123.").
  const depunctuated = normalized
    .replace(TRAILING_SENTENCE_PUNCTUATION, "")
    .replace(TRAILING_WRAPPERS, "");
  if (isPlausibleInviteToken(depunctuated)) push(depunctuated);

  return candidates;
}

/**
 * Whether the raw value needs any repair at all.
 * Used to keep the clean-link path at exactly one database round trip.
 */
export function inviteLinkIsCanonical(raw: string | null | undefined): boolean {
  const original = raw == null ? "" : String(raw);
  return original.length > 0 && original === normalizeInviteLink(original);
}
