import { isOpenHostInvitation } from "@/lib/guest-search/open-host-invitation";

const MAX_GUEST_DISPLAY_NAME = 72;

export type SocialGuestRecord = {
  name?: string | null;
  qrToken?: string | null;
  archivedAt?: Date | string | null;
  email?: string | null;
  phone?: string | null;
  id?: string | null;
  notes?: string | null;
  manualCode?: string | null;
};

export type ResolvedSocialInvitationGuest = {
  displayName: string;
  guestToken: string;
};

function isBlank(value?: string | null): boolean {
  return !value || !value.trim();
}

function looksLikeEmail(value: string): boolean {
  return /@/.test(value);
}

function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return false;
  return /^[+]?\d[\d\s().-]{6,}$/.test(value.trim());
}

function looksLikeInternalIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (/^(guest|usr|inv|seat|adm)_/i.test(trimmed)) return true;
  if (/^c[a-z0-9]{20,}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  if (!/\s/.test(trimmed) && /^[a-z0-9_-]{20,}$/i.test(trimmed)) return true;
  return false;
}

/**
 * Guest-facing display name for social cards. Uses the stored name as-is
 * (no invented titles or gender). Rejects emails, phones, tokens, and IDs.
 */
export function sanitizeSocialGuestDisplayName(value?: string | null): string | null {
  const raw = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!raw) return null;
  if (looksLikeEmail(raw) || looksLikePhone(raw) || looksLikeInternalIdentifier(raw)) {
    return null;
  }
  if (raw.length <= MAX_GUEST_DISPLAY_NAME) return raw;
  const sliced = raw.slice(0, MAX_GUEST_DISPLAY_NAME - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > MAX_GUEST_DISPLAY_NAME * 0.45 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe.trimEnd()}…`;
}

function isArchivedGuest(guest: SocialGuestRecord): boolean {
  return Boolean(guest.archivedAt);
}

/**
 * Guest locking for invitation surfaces.
 * A valid `?guest=` token wins. HTML RSVP may still sole-assign a closed
 * invitation without a query. Open/general hosts never inherit a roster name.
 *
 * Social OG metadata and `/api/social/invite/[link]/image` MUST only call
 * this when an explicit `?guest=` query is present so a sole assigned guest
 * cannot leak into public crawler cards or image URLs.
 *
 * Personalization is derived only from URL + invitation records — never
 * cookies, localStorage, or the current browser session.
 */
export function resolveSocialInvitationGuest(input: {
  guestToken?: string | null;
  tokenGuest?: SocialGuestRecord | null;
  invitationName?: string | null;
  isGeneralPass?: boolean | null;
  eventTitle?: string | null;
  guests?: SocialGuestRecord[] | null;
}): ResolvedSocialInvitationGuest | null {
  const requestedToken = input.guestToken?.trim() ?? "";
  const activeGuests = (input.guests ?? []).filter((guest) => !isArchivedGuest(guest));

  if (requestedToken) {
    const tokenGuest = input.tokenGuest;
    if (!tokenGuest || isArchivedGuest(tokenGuest)) return null;
    const recordToken = tokenGuest.qrToken?.trim();
    if (recordToken && recordToken !== requestedToken) return null;
    const displayName = sanitizeSocialGuestDisplayName(tokenGuest.name);
    if (!displayName) return null;
    return { displayName, guestToken: recordToken || requestedToken };
  }

  const openHost = isOpenHostInvitation({
    name: input.invitationName?.trim() || "",
    isGeneralPass: input.isGeneralPass,
    eventTitle: input.eventTitle?.trim() || "",
    guests: activeGuests.map((guest) => ({ name: guest.name ?? "" })),
  });
  if (openHost) return null;

  if (activeGuests.length !== 1) return null;
  const sole = activeGuests[0];
  const displayName = sanitizeSocialGuestDisplayName(sole.name);
  const guestToken = sole.qrToken?.trim() ?? "";
  if (!displayName || isBlank(guestToken)) return null;
  return { displayName, guestToken };
}

export function formatSocialGuestGreeting(displayName?: string | null): string | null {
  const parsed = parseAssignedGuestGreeting(displayName);
  return parsed ? `${parsed.line},` : null;
}

const GUEST_HONORIFICS: Array<{ match: RegExp; label: string }> = [
  { match: /^(mr\.?\s*(?:and|&)\s*mrs\.?)(?=\s|$|,)/i, label: "Mr & Mrs" },
  { match: /^(pastor)(?=\s|$|,)/i, label: "Pastor" },
  { match: /^(mrs\.?\s*(?:and|&)\s*mr\.?)(?=\s|$|,)/i, label: "Mr & Mrs" },
  { match: /^(miss)(?=\s|$|,)/i, label: "Miss" },
  { match: /^(mrs\.?)(?=\s|$|,)/i, label: "Mrs" },
  { match: /^(ms\.?)(?=\s|$|,)/i, label: "Ms" },
  { match: /^(mr\.?)(?=\s|$|,)/i, label: "Mr" },
  { match: /^(dr\.?)(?=\s|$|,)/i, label: "Dr" },
  { match: /^(prof(?:essor)?\.?)(?=\s|$|,)/i, label: "Prof" },
  { match: /^(rev(?:erend)?\.?)(?=\s|$|,)/i, label: "Rev" },
];

export type AssignedGuestGreeting = {
  salutation: "Dear";
  honorific: string | null;
  name: string;
  line: string;
};

/**
 * Stationery greeting for an assigned invitation.
 * Keeps an honorific the organiser already typed (Mr / Mrs / Miss / Ms / Dr).
 * Never invents gender or a title when the stored name has none.
 */
export function parseAssignedGuestGreeting(raw?: string | null): AssignedGuestGreeting | null {
  const sanitized = sanitizeSocialGuestDisplayName(raw);
  if (!sanitized) return null;
  const stripped = sanitized.replace(/^dear\s+/i, "").trim();
  if (!stripped) return null;

  for (const entry of GUEST_HONORIFICS) {
    const hit = stripped.match(entry.match);
    if (!hit) continue;
    const rest = stripped.slice(hit[0].length).replace(/^[\s,.-]+/, "").trim();
    if (!rest) {
      return { salutation: "Dear", honorific: entry.label, name: "", line: `Dear ${entry.label}` };
    }
    return {
      salutation: "Dear",
      honorific: entry.label,
      name: rest,
      line: `Dear ${entry.label} ${rest}`,
    };
  }

  return { salutation: "Dear", honorific: null, name: stripped, line: `Dear ${stripped}` };
}
