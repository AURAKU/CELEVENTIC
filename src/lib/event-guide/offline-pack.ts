/**
 * Level 2 — Venue Offline Pack format, tokens and integrity.
 *
 * A pack is a signed, expiring ZIP an authorised organizer downloads and runs
 * on a machine on the venue Wi-Fi. It is never a public download: the token is
 * unguessable, only its SHA-256 is stored server-side, the manifest is HMAC
 * signed over the digests of every packed file, and the local runner refuses to
 * start if the signature does not verify.
 *
 * Privacy modes decide what the seating index may contain. Two of the three
 * ship no readable guest names at all, and that is the default.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeNameKey } from "./seating-finder";
import type { EventGuidePayload } from "./types";

export const OFFLINE_PACK_FORMAT = "celeventic.event-guide-pack/1";
export const OFFLINE_TOKEN_PREFIX = "egp1";
export const OFFLINE_TOKEN_PATTERN = /^egp1\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{22}$/;

const NONCE_BYTES = 16;
const TAG_BYTES = 16;

export type OfflineSeatingMode = "DISABLED" | "CODE_ONLY" | "HASHED_NAME" | "NAME_INDEX";

export const OFFLINE_SEATING_MODE_LABELS: Record<
  OfflineSeatingMode,
  { label: string; detail: string; privacy: "highest" | "high" | "reduced" }
> = {
  DISABLED: {
    label: "No offline seating",
    detail: "The venue pack carries the programme and menu only. Seat lookup needs the internet.",
    privacy: "highest",
  },
  CODE_ONLY: {
    label: "Admission code only (recommended)",
    detail:
      "Guests type their admission code. The pack stores only one-way hashes of codes — no guest names are inside it.",
    privacy: "highest",
  },
  HASHED_NAME: {
    label: "Name, stored as one-way hashes",
    detail:
      "Guests type their name and it must match exactly. The pack stores only hashes — no readable names are inside it.",
    privacy: "high",
  },
  NAME_INDEX: {
    label: "Readable name index (least private)",
    detail:
      "Guests can type a partial name. The pack contains readable guest names, so treat the download like a guest list.",
    privacy: "reduced",
  },
};

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function signingKey(): string {
  const secret =
    process.env.EVENT_GUIDE_PACK_SECRET ??
    process.env.VENDOR_ACCESS_SECRET ??
    process.env.ADMISSION_PASS_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
      ? "celeventic-dev-event-guide-pack"
      : undefined);
  if (!secret) {
    throw new Error(
      "EVENT_GUIDE_PACK_SECRET (or VENDOR_ACCESS_SECRET / ADMISSION_PASS_SECRET / NEXTAUTH_SECRET) must be set"
    );
  }
  return secret;
}

function tokenTag(nonce: string): string {
  return b64url(
    createHmac("sha256", signingKey())
      .update(`${OFFLINE_TOKEN_PREFIX}.${nonce}`)
      .digest()
      .subarray(0, TAG_BYTES)
  );
}

export function mintOfflinePackToken(): { nonce: string; token: string } {
  const nonce = b64url(randomBytes(NONCE_BYTES));
  return { nonce, token: `${OFFLINE_TOKEN_PREFIX}.${nonce}.${tokenTag(nonce)}` };
}

export function looksLikeOfflinePackToken(value: string): boolean {
  return OFFLINE_TOKEN_PATTERN.test(value.trim());
}

export function verifyOfflinePackToken(value: string): boolean {
  const token = value.trim();
  if (!looksLikeOfflinePackToken(token)) return false;
  const parts = token.split(".");
  try {
    const a = Buffer.from(parts[2]!);
    const b = Buffer.from(tokenTag(parts[1]!));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function hashOfflinePackToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/** Stable one-way key for a seating index entry. Salted per pack. */
export function seatingIndexKey(salt: string, value: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

export interface OfflineSeatingEntry {
  /** Hashed lookup key, or the normalised readable name in NAME_INDEX mode. */
  k: string;
  /** Party display name — omitted entirely unless the mode allows readable names. */
  n?: string;
  table: string | null;
  seat: string | null;
  zone: string | null;
  ceremonyRow: string | null;
  ceremonySeat: string | null;
  /** Party member display names, only in NAME_INDEX mode. */
  members?: string[];
  /** Unnamed plus-ones travelling with the party. */
  plusOnes: number;
  /** Party size, always safe to include — it reveals nothing identifying. */
  size: number;
}

export interface OfflineSeatingSource {
  partyName: string;
  admissionCodes: string[];
  members: string[];
  plusOnes: number;
  table: string | null;
  seat: string | null;
  zone: string | null;
  ceremonyRow: string | null;
  ceremonySeat: string | null;
}

/**
 * Build the seating index for a pack.
 *
 * CODE_ONLY and HASHED_NAME emit hashed keys and no names — a stolen pack
 * yields nothing to someone who does not already know the code or exact name.
 * NAME_INDEX is the only mode that writes readable names, and only because
 * tolerant matching is impossible without them.
 */
export function buildOfflineSeatingIndex(
  sources: OfflineSeatingSource[],
  mode: OfflineSeatingMode,
  salt: string
): OfflineSeatingEntry[] {
  if (mode === "DISABLED") return [];

  const entries: OfflineSeatingEntry[] = [];

  for (const source of sources) {
    const base = {
      table: source.table,
      seat: source.seat,
      zone: source.zone,
      ceremonyRow: source.ceremonyRow,
      ceremonySeat: source.ceremonySeat,
      plusOnes: Math.max(0, source.plusOnes),
      size: source.members.length + Math.max(0, source.plusOnes),
    };

    if (mode === "CODE_ONLY") {
      for (const code of source.admissionCodes) {
        const digits = code.replace(/[^0-9]/g, "");
        if (!digits) continue;
        entries.push({ k: seatingIndexKey(salt, `code:${digits}`), ...base });
      }
      continue;
    }

    const nameKeys = new Set<string>();
    const partyKey = normalizeNameKey(source.partyName);
    if (partyKey) nameKeys.add(partyKey);
    for (const member of source.members) {
      const key = normalizeNameKey(member);
      if (key) nameKeys.add(key);
    }

    if (mode === "HASHED_NAME") {
      for (const key of nameKeys) {
        entries.push({ k: seatingIndexKey(salt, `name:${key}`), ...base });
      }
      continue;
    }

    entries.push({
      k: partyKey || normalizeNameKey(source.members[0] ?? "guest"),
      n: source.partyName,
      members: source.members,
      ...base,
    });
  }

  return entries;
}

/** Look up an entry the same way the online finder would. */
export function findOfflineSeatingEntry(
  entries: OfflineSeatingEntry[],
  mode: OfflineSeatingMode,
  salt: string,
  rawQuery: string
): { status: "ok"; entry: OfflineSeatingEntry } | { status: "no_match" } | { status: "ambiguous"; matchCount: number } {
  if (mode === "DISABLED") return { status: "no_match" };

  if (mode === "CODE_ONLY") {
    const digits = rawQuery.replace(/[^0-9]/g, "");
    if (!digits) return { status: "no_match" };
    const key = seatingIndexKey(salt, `code:${digits}`);
    const entry = entries.find((e) => e.k === key);
    return entry ? { status: "ok", entry } : { status: "no_match" };
  }

  const query = normalizeNameKey(rawQuery);
  if (!query) return { status: "no_match" };

  if (mode === "HASHED_NAME") {
    const key = seatingIndexKey(salt, `name:${query}`);
    const entry = entries.find((e) => e.k === key);
    return entry ? { status: "ok", entry } : { status: "no_match" };
  }

  const tokens = query.split(" ").filter(Boolean);
  const matches = entries.filter((entry) => {
    const haystacks = [entry.k, ...(entry.members ?? []).map((m) => normalizeNameKey(m))];
    return haystacks.some((hay) => {
      if (hay === query) return true;
      const hayTokens = hay.split(" ").filter(Boolean);
      return tokens.every((t) => hayTokens.some((h) => h === t || h.startsWith(t)));
    });
  });

  if (matches.length === 0) return { status: "no_match" };
  if (matches.length > 1) return { status: "ambiguous", matchCount: matches.length };
  return { status: "ok", entry: matches[0]! };
}

export interface OfflinePackFileDigest {
  path: string;
  sha256: string;
  bytes: number;
}

export interface OfflinePackManifest {
  format: typeof OFFLINE_PACK_FORMAT;
  packVersion: number;
  guideVersion: number;
  eventTitle: string;
  tokenPrefix: string;
  /** The raw local token — the pack IS the credential; it holds nothing else. */
  offlineToken: string;
  seatingMode: OfflineSeatingMode;
  seatingSalt: string;
  issuedAt: string;
  expiresAt: string;
  venueWifiName: string | null;
  venueLocalUrl: string | null;
  files: OfflinePackFileDigest[];
  signature: string;
}

export function digestFile(path: string, content: Buffer | string): OfflinePackFileDigest {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return { path, sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.byteLength };
}

/** Signature covers every field except the signature itself. */
export function signManifest(manifest: Omit<OfflinePackManifest, "signature">): string {
  const canonical = JSON.stringify({
    format: manifest.format,
    packVersion: manifest.packVersion,
    guideVersion: manifest.guideVersion,
    eventTitle: manifest.eventTitle,
    seatingMode: manifest.seatingMode,
    issuedAt: manifest.issuedAt,
    expiresAt: manifest.expiresAt,
    files: manifest.files.map((f) => [f.path, f.sha256, f.bytes]),
  });
  return createHmac("sha256", signingKey()).update(canonical).digest("hex");
}

export function verifyManifestSignature(manifest: OfflinePackManifest): boolean {
  const { signature, ...body } = manifest;
  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(signManifest(body), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isPackExpired(manifest: { expiresAt: string }, now: Date = new Date()): boolean {
  const expiry = new Date(manifest.expiresAt);
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry.getTime() <= now.getTime();
}

/** Default pack lifetime: through the event and two days of clean-up after it. */
export function defaultPackExpiry(eventEnd: Date | null, eventStart: Date): Date {
  const base = eventEnd ?? eventStart;
  return new Date(base.getTime() + 48 * 60 * 60 * 1000);
}

/**
 * Last line of defence before a pack is written to disk. The guide payload is
 * already built from an allow-list, but a pack leaves our control entirely, so
 * it is scanned for anything that looks like contact data or a credential.
 */
export function assertPackPayloadIsSafe(payload: EventGuidePayload | unknown): void {
  const serialised = JSON.stringify(payload ?? {});
  const violations: string[] = [];

  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(serialised)) violations.push("email address");
  if (/(?:\+\d[\d\s().-]{8,}\d)/.test(serialised)) violations.push("phone number");
  if (/\b(?:cvs1|egp1|cpt1)\.[A-Za-z0-9_-]{16,}/.test(serialised)) violations.push("access token");
  if (/"(?:eventId|invitationId|guestId|organizerId|userId|passId)"\s*:/.test(serialised)) {
    violations.push("database identifier");
  }

  if (violations.length > 0) {
    throw new Error(`Refusing to build offline pack: payload contains ${violations.join(", ")}`);
  }
}
