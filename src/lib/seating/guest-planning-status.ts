/**
 * Seating planning signals from invitation engagement.
 *
 * OPENED / ACCEPTED / DECLINED / MAYBE help organisers arrange seats.
 * CHECKED_IN means the guest was admitted at the gate — not a planning RSVP.
 *
 * Priority only sorts the assign list. Organisers may seat any guest
 * regardless of RSVP response.
 */

export type SeatingPlanningTone =
  | "admitted"
  | "accepted"
  | "opened"
  | "maybe"
  | "declined"
  | "invited"
  | "other";

/** Lower number = seat them sooner (accepted before opened before invited). */
export function seatingAssignPriority(status?: string | null): number {
  switch (status) {
    case "ACCEPTED":
      return 0;
    case "OPENED":
      return 1;
    case "MAYBE":
      return 2;
    case "INVITED":
      return 3;
    case "CHECKED_IN":
      return 4;
    case "DECLINED":
      return 5;
    default:
      return 6;
  }
}

export function seatingPlanningTone(status?: string | null): SeatingPlanningTone {
  switch (status) {
    case "CHECKED_IN":
      return "admitted";
    case "ACCEPTED":
      return "accepted";
    case "OPENED":
      return "opened";
    case "MAYBE":
      return "maybe";
    case "DECLINED":
      return "declined";
    case "INVITED":
      return "invited";
    default:
      return "other";
  }
}

export function seatingPlanningLabel(status?: string | null): string {
  switch (status) {
    case "CHECKED_IN":
      return "Admitted";
    case "ACCEPTED":
      return "Accepted";
    case "OPENED":
      return "Opened invite";
    case "MAYBE":
      return "Maybe";
    case "DECLINED":
      return "Declined";
    case "INVITED":
      return "Invited";
    default:
      return status?.trim() || "Guest";
  }
}

export function compareGuestsForSeatingAssign<T extends { name: string; status?: string | null }>(
  a: T,
  b: T
): number {
  const byPriority = seatingAssignPriority(a.status) - seatingAssignPriority(b.status);
  if (byPriority !== 0) return byPriority;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}
