import { RowIssueCode, type ImportOptions, type NormalizedRow } from "./types";
import { nameKey } from "./name";

/**
 * Duplicate detection.
 *
 * Two rules govern this file:
 *
 *  1. Nothing is ever merged silently. A match flips the row to DUPLICATE and
 *     leaves the decision to the organiser — because "Kwame Mensah" appearing
 *     twice is just as likely to be two real cousins as one double entry.
 *  2. Contact matches are stronger than name matches. A shared phone number or
 *     email is near-certainly the same person; a shared name is a question.
 */

export interface ExistingGuestRecord {
  guestId: string;
  invitationId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface ExistingInvitationRecord {
  invitationId: string;
  name: string;
}

export interface DuplicateIndex {
  guestsByNameKey: Map<string, ExistingGuestRecord>;
  guestsByEmail: Map<string, ExistingGuestRecord>;
  guestsByPhone: Map<string, ExistingGuestRecord>;
  invitationsByNameKey: Map<string, ExistingInvitationRecord>;
}

export function buildDuplicateIndex(
  guests: ExistingGuestRecord[],
  invitations: ExistingInvitationRecord[]
): DuplicateIndex {
  const guestsByNameKey = new Map<string, ExistingGuestRecord>();
  const guestsByEmail = new Map<string, ExistingGuestRecord>();
  const guestsByPhone = new Map<string, ExistingGuestRecord>();
  const invitationsByNameKey = new Map<string, ExistingInvitationRecord>();

  for (const guest of guests) {
    const key = nameKey(guest.name);
    if (key && !guestsByNameKey.has(key)) guestsByNameKey.set(key, guest);
    if (guest.email) {
      const email = guest.email.trim().toLowerCase();
      if (email && !guestsByEmail.has(email)) guestsByEmail.set(email, guest);
    }
    if (guest.phone) {
      const phone = guest.phone.replace(/\D+/g, "");
      if (phone.length >= 7 && !guestsByPhone.has(phone)) guestsByPhone.set(phone, guest);
    }
  }

  for (const invitation of invitations) {
    const key = nameKey(invitation.name);
    if (key && !invitationsByNameKey.has(key)) invitationsByNameKey.set(key, invitation);
  }

  return { guestsByNameKey, guestsByEmail, guestsByPhone, invitationsByNameKey };
}

export const EMPTY_DUPLICATE_INDEX: DuplicateIndex = {
  guestsByNameKey: new Map(),
  guestsByEmail: new Map(),
  guestsByPhone: new Map(),
  invitationsByNameKey: new Map(),
};

function phoneKey(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, "");
  return digits.length >= 7 ? digits : null;
}

/**
 * Flag duplicates in place.
 *
 * Within the file, the *first* occurrence stays as-is and later ones point
 * back at it, so an organiser reading top-to-bottom sees the original and its
 * echoes rather than two rows accusing each other.
 */
export function markDuplicates(
  rows: NormalizedRow[],
  index: DuplicateIndex,
  options: Pick<ImportOptions, "duplicatePolicy">
): NormalizedRow[] {
  const seenNames = new Map<string, number>();
  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();

  for (const row of rows) {
    if (row.status === "INVALID") continue;

    const key = nameKey(row.name);
    const email = row.email?.trim().toLowerCase() ?? null;
    const phone = phoneKey(row.phone);

    let duplicate = false;

    // ── Within this import ──
    const priorByEmail = email ? seenEmails.get(email) : undefined;
    const priorByPhone = phone ? seenPhones.get(phone) : undefined;
    const priorByName = key ? seenNames.get(key) : undefined;
    const prior = priorByEmail ?? priorByPhone ?? priorByName;

    if (prior != null) {
      row.duplicateOfRowIndex = prior;
      row.issues.push({
        code: RowIssueCode.DUPLICATE_IN_FILE,
        severity: "warning",
        message:
          priorByEmail != null || priorByPhone != null
            ? `Same contact details as row ${prior + 1} in this import.`
            : `Same name as row ${prior + 1} in this import.`,
      });
      duplicate = true;
    }

    // ── Against what the event already has ──
    if (!duplicate) {
      const existingGuest =
        (email ? index.guestsByEmail.get(email) : undefined) ??
        (phone ? index.guestsByPhone.get(phone) : undefined) ??
        (key ? index.guestsByNameKey.get(key) : undefined);

      if (existingGuest) {
        row.duplicateOfGuestId = existingGuest.guestId;
        row.duplicateOfInvitationId = existingGuest.invitationId;
        row.issues.push({
          code: RowIssueCode.DUPLICATE_EXISTING_GUEST,
          severity: "warning",
          message: `"${existingGuest.name}" is already on this event's guest list.`,
        });
        duplicate = true;
      } else if (key) {
        const existingInvitation = index.invitationsByNameKey.get(key);
        if (existingInvitation) {
          row.duplicateOfInvitationId = existingInvitation.invitationId;
          row.issues.push({
            code: RowIssueCode.DUPLICATE_EXISTING_INVITATION,
            severity: "warning",
            message: `An invitation named "${existingInvitation.name}" already exists for this event.`,
          });
          duplicate = true;
        }
      }
    }

    if (duplicate) {
      row.status = "DUPLICATE";
      row.decision =
        options.duplicatePolicy === "SKIP"
          ? "SKIP"
          : options.duplicatePolicy === "CREATE_ANYWAY"
            ? "CREATE"
            : "SKIP"; // REVIEW: default to the safe choice until a human decides.
    }

    if (key && !seenNames.has(key)) seenNames.set(key, row.rowIndex);
    if (email && !seenEmails.has(email)) seenEmails.set(email, row.rowIndex);
    if (phone && !seenPhones.has(phone)) seenPhones.set(phone, row.rowIndex);
  }

  return rows;
}

/** Flag two import rows competing for the same seat. */
export function markSeatConflicts(
  rows: NormalizedRow[],
  takenSeats: Set<string> = new Set()
): NormalizedRow[] {
  const seen = new Map<string, number>();

  for (const row of rows) {
    if (!row.tableNumber || row.status === "INVALID") continue;
    const key = `${row.tableNumber.trim().toLowerCase()}::${(row.seatLabel ?? "").trim().toLowerCase()}`;
    // A table with no seat label is a shared table, not a claimed chair.
    if (!row.seatLabel) continue;

    const prior = seen.get(key);
    if (prior != null || takenSeats.has(key)) {
      row.issues.push({
        code: RowIssueCode.SEAT_CONFLICT,
        severity: "warning",
        message:
          prior != null
            ? `Table ${row.tableNumber} seat ${row.seatLabel} is also claimed by row ${prior + 1}.`
            : `Table ${row.tableNumber} seat ${row.seatLabel} is already assigned to another guest.`,
      });
      if (row.status === "READY") row.status = "NEEDS_REVIEW";
    } else {
      seen.set(key, row.rowIndex);
    }
  }

  return rows;
}

export interface RowSummary {
  total: number;
  ready: number;
  review: number;
  duplicate: number;
  invalid: number;
  skipped: number;
  /** Heads that would be admitted if the batch were generated as decided. */
  heads: number;
}

export function summarizeRows(rows: NormalizedRow[]): RowSummary {
  const summary: RowSummary = {
    total: rows.length,
    ready: 0,
    review: 0,
    duplicate: 0,
    invalid: 0,
    skipped: 0,
    heads: 0,
  };

  for (const row of rows) {
    switch (row.status) {
      case "READY":
        summary.ready++;
        break;
      case "NEEDS_REVIEW":
        summary.review++;
        break;
      case "DUPLICATE":
        summary.duplicate++;
        break;
      case "INVALID":
        summary.invalid++;
        break;
      case "SKIPPED":
        summary.skipped++;
        break;
      default:
        break;
    }
    if (row.decision === "CREATE" && row.status !== "INVALID") summary.heads += row.partySize;
  }

  return summary;
}
