import { prisma } from "@/lib/prisma";
import {
  inviteLinkCandidates,
  isPlausibleInviteToken,
  normalizeInviteLink,
} from "@/lib/invitation/invite-link";

/**
 * Server-side resolution of a guest-supplied invite link to the canonical
 * `Invitation.uniqueLink` stored in the database.
 *
 * Ordering is deliberate and never fuzzy-first:
 *   1. the untouched value (exact, case-sensitive `@unique` lookup)
 *   2. normalised variants, highest-confidence first
 *   3. a case-insensitive match — only when it resolves to exactly one row
 *
 * Step 3 exists because some carriers lower-case the whole URL. SQLite has no
 * Prisma `mode: "insensitive"`, so it runs as an explicit `LOWER()` query that
 * refuses to guess: two rows differing only by case are treated as not found
 * rather than resolved to the wrong party.
 */

interface ResolveOptions {
  /** Candidates the caller has already probed with its own exact lookup. */
  skip?: readonly string[];
  /**
   * Set false to disable the case-insensitive last resort (e.g. write paths
   * where only an exact bearer token should ever be accepted).
   */
  allowCaseInsensitive?: boolean;
}

async function findExact(uniqueLink: string): Promise<string | null> {
  const row = await prisma.invitation.findUnique({
    where: { uniqueLink },
    select: { uniqueLink: true },
  });
  return row?.uniqueLink ?? null;
}

/**
 * Case-insensitive last resort. Raw SQL because SQLite's default BINARY
 * collation makes Prisma `equals` case-sensitive and `mode: "insensitive"`
 * is unsupported on this provider.
 *
 * `LIMIT 2` is what makes this safe: more than one match is ambiguous and is
 * rejected, so a case-folded query can never hand a guest another party's
 * invitation.
 */
async function findCaseInsensitiveUnambiguous(needle: string): Promise<string | null> {
  if (!isPlausibleInviteToken(needle)) return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ uniqueLink: string }>>`
      SELECT uniqueLink FROM invitations WHERE LOWER(uniqueLink) = LOWER(${needle}) LIMIT 2
    `;
    if (rows.length !== 1) return null;
    return rows[0].uniqueLink;
  } catch (error) {
    // A dialect/schema surprise must never take a live invitation down —
    // the exact-match answer ("not found") still stands.
    console.warn("[invite-link] case-insensitive fallback unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Canonical `uniqueLink` for a raw route param / query value, or `null`.
 *
 * Costs one query for a clean link, and only pays for repair attempts when
 * the incoming value is actually damaged.
 */
export async function resolveCanonicalInviteLink(
  rawLink: string | null | undefined,
  options: ResolveOptions = {}
): Promise<string | null> {
  const skip = new Set(options.skip ?? []);
  const candidates = inviteLinkCandidates(rawLink).filter((c) => !skip.has(c));

  for (const candidate of candidates) {
    const found = await findExact(candidate);
    if (found) return found;
  }

  if (options.allowCaseInsensitive === false) return null;

  const normalized = normalizeInviteLink(rawLink);
  if (!normalized) return null;
  return findCaseInsensitiveUnambiguous(normalized);
}

/**
 * Convenience for callers that already ran their own exact `findUnique` on the
 * raw param and got nothing — skips repeating that query.
 */
export async function repairInviteLink(
  rawLink: string | null | undefined
): Promise<string | null> {
  const raw = rawLink == null ? "" : String(rawLink);
  // Nothing to repair when the value is already canonical: the caller's exact
  // lookup has proven there is no such invitation.
  if (inviteLinkCandidates(raw).length <= 1) {
    const normalized = normalizeInviteLink(raw);
    if (!normalized) return null;
    return findCaseInsensitiveUnambiguous(normalized);
  }
  return resolveCanonicalInviteLink(raw, { skip: [raw] });
}
