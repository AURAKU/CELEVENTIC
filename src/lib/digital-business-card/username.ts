/**
 * CeleYou public usernames. Display names stay free-form and may repeat.
 * The unique public handle is a separate, canonical string used at /u/{username}.
 * Permanent card identity stays on publicToken (/c) and NFC tokens (/n).
 */

export const CELEYOU_USERNAME_MIN = 3;
export const CELEYOU_USERNAME_MAX = 30;
export const CELEYOU_USERNAME_HOLD_DAYS = 90;
export const CELEYOU_USERNAME_PATTERN = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/;

export const CELEYOU_USERNAME_KINDS = ["ACTIVE", "ALIAS", "HOLD", "RESERVED", "SLUG"] as const;
export type CeleYouUsernameKind = (typeof CELEYOU_USERNAME_KINDS)[number];

export const CELEYOU_USERNAME_REASONS = ["AVAILABLE", "INVALID", "TAKEN", "RESERVED", "HOLD"] as const;
export type CeleYouUsernameReason = (typeof CELEYOU_USERNAME_REASONS)[number];

/** System, brand, and route tokens. Admin may add more via RESERVED rows. */
export const CELEYOU_RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "api",
  "billing",
  "c",
  "card",
  "cards",
  "celeventic",
  "celeyou",
  "claim",
  "create",
  "demo",
  "edit",
  "help",
  "login",
  "n",
  "new",
  "official",
  "preview",
  "present",
  "privacy",
  "root",
  "security",
  "staff",
  "studio",
  "support",
  "u",
  "username",
  "usernames",
  "www",
] as const;

const RESERVED_SET = new Set<string>(CELEYOU_RESERVED_USERNAMES);
const BRAND_COMPACT = new Set(["celeyou", "celeventic", "official"]);

export type CeleYouUsernameSeed = {
  displayName?: string | null;
  nickname?: string | null;
  company?: string | null;
  profession?: string | null;
  keywords?: string[] | null;
};

export type CeleYouUsernameParse =
  | { ok: true; username: string }
  | { ok: false; reason: "INVALID"; message: string };

export function stripUsernameSigil(raw: string): string {
  return raw.replace(/^@+/, "");
}

/** Canonical form. Does not invent a handle. Existing stored values are never rewritten here. */
export function normalizeCeleYouUsername(raw: string | null | undefined): string {
  return stripUsernameSigil(String(raw ?? ""))
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

export function isReservedCeleYouUsername(username: string): boolean {
  const value = normalizeCeleYouUsername(username);
  if (!value) return true;
  if (RESERVED_SET.has(value)) return true;
  const compact = value.replace(/[._]/g, "");
  if (BRAND_COMPACT.has(compact)) return true;
  const head = value.split(/[._]/)[0] ?? "";
  if (head === "celeyou" || head === "celeventic" || head === "official") return true;
  return false;
}

export function parseCeleYouUsername(raw: string | null | undefined): CeleYouUsernameParse {
  const username = normalizeCeleYouUsername(raw);
  if (!username) {
    return { ok: false, reason: "INVALID", message: "Enter a username of 3 to 30 characters." };
  }
  if (username.length < CELEYOU_USERNAME_MIN) {
    return { ok: false, reason: "INVALID", message: "Usernames need at least 3 characters." };
  }
  if (username.length > CELEYOU_USERNAME_MAX) {
    return { ok: false, reason: "INVALID", message: "Usernames can be 30 characters at most." };
  }
  if (/[A-Z]/.test(stripUsernameSigil(String(raw ?? "")).normalize("NFKC").trim())) {
    // Case is folded. Mixed case input is accepted after normalize, not rejected.
  }
  if (/\s/.test(username)) {
    return { ok: false, reason: "INVALID", message: "Usernames cannot include spaces." };
  }
  if (username.startsWith(".") || username.endsWith(".")) {
    return { ok: false, reason: "INVALID", message: "Usernames cannot start or end with a period." };
  }
  if (username.includes("..")) {
    return { ok: false, reason: "INVALID", message: "Usernames cannot contain consecutive periods." };
  }
  if (!CELEYOU_USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      reason: "INVALID",
      message: "Use lowercase letters, numbers, underscores, and periods only.",
    };
  }
  return { ok: true, username };
}

/** Keep a trailing separator while the owner is still typing. Never used as a stored value. */
export function constrainCeleYouUsernameInput(raw: string): string {
  const keepTail = /[._]$/.test(raw);
  let next = stripUsernameSigil(raw)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, CELEYOU_USERNAME_MAX);
  if (!keepTail) next = next.replace(/[._]+$/, "");
  return next;
}

function tokeniseName(value: string | null | undefined): string[] {
  return normalizeCeleYouUsername(value)
    .replace(/[._]/g, " ")
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function initialsFrom(value: string | null | undefined): string {
  const parts = String(value ?? "")
    .normalize("NFKC")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .map((part) => part[0])
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 4);
}

function pushCandidate(out: string[], seen: Set<string>, raw: string) {
  const parsed = parseCeleYouUsername(raw);
  if (!parsed.ok) return;
  if (seen.has(parsed.username)) return;
  seen.add(parsed.username);
  out.push(parsed.username);
}

/**
 * Memorable alternatives. Never appends -2, -3 sequential suffixes.
 * Callers must still check the database before offering a suggestion.
 */
export function suggestCeleYouUsernames(
  seed: CeleYouUsernameSeed,
  taken: (username: string) => boolean,
  limit = 5
): string[] {
  const names = tokeniseName(seed.displayName);
  const nick = tokeniseName(seed.nickname);
  const company = tokeniseName(seed.company);
  const profession = tokeniseName(seed.profession);
  const keywords = (seed.keywords ?? []).flatMap((item) => tokeniseName(item));
  const first = names[0] ?? nick[0] ?? "";
  const last = names.length > 1 ? names[names.length - 1] : "";
  const initials = initialsFrom(seed.displayName);
  const companyShort = company[0] ?? "";
  const role = profession[0] ?? keywords[0] ?? "";
  const seen = new Set<string>();
  const out: string[] = [];

  const tryPush = (value: string) => {
    if (out.length >= limit) return;
    const parsed = parseCeleYouUsername(value);
    if (!parsed.ok) return;
    if (isReservedCeleYouUsername(parsed.username)) return;
    if (taken(parsed.username)) return;
    pushCandidate(out, seen, parsed.username);
  };

  if (nick[0]) tryPush(nick[0]);
  if (first && last) {
    tryPush(`${first}.${last}`);
    tryPush(`${first}_${last}`);
    tryPush(`${first}${last}`);
  }
  if (first) tryPush(first);
  if (first && companyShort) {
    tryPush(`${first}_${companyShort}`);
    tryPush(`${first}.${companyShort}`);
  }
  if (first && role) tryPush(`${first}_${role}`);
  if (initials && last) tryPush(`${initials}${last}`);
  if (first && initials && initials !== first) tryPush(`${first}${initials}`);
  for (const word of keywords) {
    if (first) tryPush(`${first}_${word}`);
    else tryPush(word);
  }
  if (first && last) tryPush(`${first[0] ?? ""}${last}`);
  const year = String(new Date().getUTCFullYear());
  if (first) tryPush(`${first}${year.slice(2)}`);
  if (first && companyShort) tryPush(`${first}${companyShort}`);
  if (first) {
    tryPush(`${first}_studio`);
    tryPush(`${first}.live`);
  }
  return out.slice(0, limit);
}

export function celeYouUsernamePublicPath(username: string): string {
  return `/u/${encodeURIComponent(normalizeCeleYouUsername(username))}`;
}

export function celeYouUsernameHoldUntil(from = new Date(), days = CELEYOU_USERNAME_HOLD_DAYS): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function usernameAvailabilityMessage(reason: CeleYouUsernameReason, username?: string): string {
  if (reason === "AVAILABLE") return username ? `@${username} is available.` : "That username is available.";
  if (reason === "TAKEN") return "That username is taken. Try one of the suggestions, or enter another.";
  if (reason === "RESERVED") return "That username is reserved.";
  if (reason === "HOLD") return "That username is not available yet.";
  return "That username is not valid.";
}
