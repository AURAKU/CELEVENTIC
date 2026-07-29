import { prisma } from "@/lib/prisma";
import { cleanName, nameKey, stripTitles } from "@/lib/guest-import/name";
import type { DuplicateWarning } from "@/lib/guest-search/types";

/**
 * Event-scoped duplicate detection for guest / invitation display names.
 *
 * ACTIVE (non-archived) rows only. Name matches use `nameKey` (trim + case +
 * accent + title insensitive). Contact matches are stronger signals. Nothing
 * is merged here — callers return 409 and the organiser decides.
 */

export class DuplicateGuestError extends Error {
  readonly duplicates: DuplicateWarning[];

  constructor(duplicates: DuplicateWarning[]) {
    super(
      duplicates[0]?.message ??
        "Someone with this name is already on the guest list."
    );
    this.name = "DuplicateGuestError";
    this.duplicates = duplicates;
  }
}

/** Longest distinctive token used to gather DB candidates cheaply. */
export function duplicateProbe(name: string): string {
  const tokens = stripTitles(cleanName(name)).split(" ").filter(Boolean);
  if (tokens.length === 0) return cleanName(name);
  return tokens.reduce((longest, token) => (token.length > longest.length ? token : longest));
}

export interface NameDuplicateCandidate {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  kind: "guest" | "invitation";
}

/**
 * Pure matcher — unit-tested without Prisma.
 * Exact name-key collisions and contact collisions become warnings.
 */
export function collectDuplicateWarnings(
  candidates: NameDuplicateCandidate[],
  input: { name: string; email?: string | null; phone?: string | null },
  options?: { excludeGuestIds?: Set<string>; excludeInvitationIds?: Set<string> }
): DuplicateWarning[] {
  const key = nameKey(input.name);
  const email = input.email?.trim().toLowerCase() || null;
  const phoneDigits = input.phone?.replace(/\D+/g, "") ?? null;
  const excludeGuests = options?.excludeGuestIds ?? new Set();
  const excludeInvitations = options?.excludeInvitationIds ?? new Set();

  const warnings: DuplicateWarning[] = [];
  const seenKeys = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.kind === "guest" && excludeGuests.has(candidate.id)) continue;
    if (candidate.kind === "invitation" && excludeInvitations.has(candidate.id)) continue;

    const dedupeKey = `${candidate.kind}:${candidate.id}`;
    if (seenKeys.has(dedupeKey)) continue;

    if (email && candidate.email?.toLowerCase() === email) {
      warnings.push({
        kind: candidate.kind,
        id: candidate.id,
        name: candidate.name,
        message: `${candidate.name} already uses ${email} on this event.`,
      });
      seenKeys.add(dedupeKey);
      continue;
    }

    if (
      phoneDigits &&
      phoneDigits.length >= 7 &&
      candidate.phone &&
      candidate.phone.replace(/\D+/g, "").slice(-9) === phoneDigits.slice(-9)
    ) {
      warnings.push({
        kind: candidate.kind,
        id: candidate.id,
        name: candidate.name,
        message: `${candidate.name} already uses this phone number on this event.`,
      });
      seenKeys.add(dedupeKey);
      continue;
    }

    if (key && nameKey(candidate.name) === key) {
      warnings.push({
        kind: candidate.kind,
        id: candidate.id,
        name: candidate.name,
        message:
          candidate.kind === "guest"
            ? `"${candidate.name}" is already on this event's guest list. If this is someone else, add a distinguishing detail to the name — or edit the existing guest.`
            : `An invitation named "${candidate.name}" already exists for this event. Adjust the name if this is a different person, or edit the existing invitation.`,
      });
      seenKeys.add(dedupeKey);
    }
  }

  return warnings;
}

/** Look for anyone this new (or renamed) invitation might collide with. */
export async function findActiveGuestDuplicates(
  eventId: string,
  name: string,
  email: string | null = null,
  phone: string | null = null,
  options?: { excludeGuestIds?: string[]; excludeInvitationIds?: string[] }
): Promise<DuplicateWarning[]> {
  const displayName = cleanName(name);
  if (!displayName) return [];

  const probe = duplicateProbe(displayName);
  const phoneDigits = phone?.replace(/\D+/g, "") ?? null;

  const [guests, invitations] = await Promise.all([
    prisma.guest.findMany({
      where: {
        eventId,
        archivedAt: null,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneDigits && phoneDigits.length >= 7
            ? [{ phone: { contains: phoneDigits.slice(-9) } }]
            : []),
          { name: { contains: probe } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 50,
    }),
    prisma.invitation.findMany({
      where: {
        eventId,
        archivedAt: null,
        isGeneralPass: false,
        name: { contains: probe },
      },
      select: { id: true, name: true },
      take: 50,
    }),
  ]);

  const candidates: NameDuplicateCandidate[] = [
    ...guests.map((g) => ({ ...g, kind: "guest" as const })),
    ...invitations.map((i) => ({ ...i, kind: "invitation" as const })),
  ];

  return collectDuplicateWarnings(
    candidates,
    { name: displayName, email, phone },
    {
      excludeGuestIds: new Set(options?.excludeGuestIds ?? []),
      excludeInvitationIds: new Set(options?.excludeInvitationIds ?? []),
    }
  );
}

/** Throw when an exact active name/contact collision exists. */
export async function assertNoActiveGuestDuplicate(
  eventId: string,
  name: string,
  email: string | null = null,
  phone: string | null = null,
  options?: { excludeGuestIds?: string[]; excludeInvitationIds?: string[] }
): Promise<void> {
  const duplicates = await findActiveGuestDuplicates(eventId, name, email, phone, options);
  if (duplicates.length > 0) throw new DuplicateGuestError(duplicates);
}
