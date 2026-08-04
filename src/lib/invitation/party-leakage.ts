/**
 * Platform-wide invitation-party isolation audit (pure helpers).
 *
 * Detects roster pollution where a named guest on invitation A likely belongs
 * to invitation B on the same event — the class of bug that mixed any two
 * parties (not just one example couple/family) on public invite pages.
 */

import { nameKey, cleanName } from "@/lib/guest-import/name";

export type IsolationFindingKind =
  | "guest_name_matches_other_invitation"
  | "orphan_guest_no_invitation"
  | "pass_display_matches_other_invitation"
  | "invitation_missing_live_pass"
  | "invitation_missing_admission_code"
  | "duplicate_admission_code"
  | "empty_unique_link";

export interface IsolationInvitationRef {
  id: string;
  name: string;
  uniqueLink: string;
  eventId: string;
}

export interface IsolationGuestRef {
  id: string;
  name: string;
  invitationId: string | null;
  archivedAt?: Date | string | null;
}

export interface IsolationPassRef {
  invitationId: string;
  displayName: string | null;
  code: string | null;
  status: string;
}

export interface IsolationFinding {
  kind: IsolationFindingKind;
  eventId: string;
  invitationId: string | null;
  otherInvitationId?: string | null;
  guestId?: string | null;
  uniqueLink?: string | null;
  displayName?: string | null;
  detail: string;
  recommended: string;
  confidence: "high" | "medium";
}

function keysMatch(a: string, b: string): boolean {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // "Akua & Kelly" vs "Akua" / "Kelly" alone is NOT enough — require substantial overlap.
  if (ka.length >= 8 && kb.length >= 8 && (ka.includes(kb) || kb.includes(ka))) {
    return true;
  }
  return false;
}

/**
 * Flag guests whose name matches a *different* invitation's display name on
 * the same event, while not matching their current invitation's name.
 */
export function findMislinkedGuests(input: {
  eventId: string;
  invitations: IsolationInvitationRef[];
  guests: IsolationGuestRef[];
}): IsolationFinding[] {
  const activeInvites = input.invitations.filter((i) => i.uniqueLink?.trim());
  const findings: IsolationFinding[] = [];

  for (const guest of input.guests) {
    if (guest.archivedAt) continue;
    const guestName = cleanName(guest.name);
    if (!guestName || guestName.length < 2) continue;

    if (!guest.invitationId) {
      const matches = activeInvites.filter((inv) => keysMatch(guestName, inv.name));
      findings.push({
        kind: "orphan_guest_no_invitation",
        eventId: input.eventId,
        invitationId: null,
        otherInvitationId: matches.length === 1 ? matches[0].id : null,
        guestId: guest.id,
        displayName: guestName,
        detail:
          matches.length === 1
            ? `Guest “${guestName}” has no invitationId; uniquely matches invitation “${matches[0].name}”.`
            : `Guest “${guestName}” has no invitationId (${matches.length} possible invitation matches).`,
        recommended:
          matches.length === 1
            ? `Attach guest ${guest.id} to invitation ${matches[0].id}`
            : "Manual review — do not auto-attach ambiguous orphan",
        confidence: matches.length === 1 ? "high" : "medium",
      });
      continue;
    }

    const current = activeInvites.find((i) => i.id === guest.invitationId);
    if (!current) continue;

    // Already matches own party name (primary invitee / family label) — fine.
    if (keysMatch(guestName, current.name)) continue;

    const others = activeInvites.filter(
      (inv) => inv.id !== current.id && keysMatch(guestName, inv.name)
    );
    if (others.length === 0) continue;

    // High confidence only when exactly one other invitation matches and the
    // current invitation name does not contain this guest as a party member token.
    const currentTokens = nameKey(current.name).split(" ").filter((t) => t.length >= 3);
    const guestKey = nameKey(guestName);
    const looksLikeMemberOfCurrent = currentTokens.some(
      (t) => guestKey.includes(t) || t.includes(guestKey)
    );
    if (looksLikeMemberOfCurrent && others.length === 0) continue;

    for (const other of others) {
      findings.push({
        kind: "guest_name_matches_other_invitation",
        eventId: input.eventId,
        invitationId: current.id,
        otherInvitationId: other.id,
        guestId: guest.id,
        uniqueLink: current.uniqueLink,
        displayName: guestName,
        detail: `Guest “${guestName}” is on invitation “${current.name}” but matches separate invitation “${other.name}”.`,
        recommended: `Move guest ${guest.id} from ${current.id} → ${other.id}`,
        confidence: others.length === 1 && !looksLikeMemberOfCurrent ? "high" : "medium",
      });
    }
  }

  return findings;
}

export function findPassDisplayMismatches(input: {
  eventId: string;
  invitations: IsolationInvitationRef[];
  passes: IsolationPassRef[];
}): IsolationFinding[] {
  const LIVE = new Set([
    "ACTIVE",
    "PARTIALLY_ADMITTED",
    "ADMITTED",
    "PENDING_SYNC",
    "CONFLICT",
    "MANUAL_REVIEW",
  ]);
  const findings: IsolationFinding[] = [];
  const byId = new Map(input.invitations.map((i) => [i.id, i]));

  for (const pass of input.passes) {
    if (!LIVE.has(pass.status)) continue;
    const display = pass.displayName?.trim();
    if (!display) continue;
    const current = byId.get(pass.invitationId);
    if (!current) continue;
    if (keysMatch(display, current.name)) continue;

    const others = input.invitations.filter(
      (inv) => inv.id !== current.id && keysMatch(display, inv.name)
    );
    for (const other of others) {
      findings.push({
        kind: "pass_display_matches_other_invitation",
        eventId: input.eventId,
        invitationId: current.id,
        otherInvitationId: other.id,
        uniqueLink: current.uniqueLink,
        displayName: display,
        detail: `Pass display “${display}” on “${current.name}” matches invitation “${other.name}”.`,
        recommended: `Update GuestPass.displayName on ${current.id} to “${current.name}”`,
        confidence: others.length === 1 ? "high" : "medium",
      });
    }
  }

  return findings;
}
