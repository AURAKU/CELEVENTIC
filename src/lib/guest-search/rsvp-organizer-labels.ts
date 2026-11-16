/**
 * Organiser-facing RSVP copy — who is coming, not coming, or undecided.
 * API / DB values stay ACCEPTED | DECLINED | MAYBE.
 */

export type OrganizerRsvpStatus =
  | "INVITED"
  | "OPENED"
  | "ACCEPTED"
  | "DECLINED"
  | "MAYBE"
  | "CHECKED_IN"
  | "NO_RESPONSE"
  | string
  | null
  | undefined;

export function organizerRsvpLabel(status: OrganizerRsvpStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "Coming";
    case "DECLINED":
      return "Not coming";
    case "MAYBE":
      return "Maybe";
    case "CHECKED_IN":
      return "Checked in";
    case "OPENED":
      return "Opened";
    case "INVITED":
      return "Invited";
    case "NO_RESPONSE":
      return "No reply";
    default:
      return status ? String(status).replaceAll("_", " ") : "No reply";
  }
}

/** Short line for in-app / email notifications after a guest taps Accept / Decline / Maybe. */
export function organizerRsvpDecisionPhrase(
  response: "ACCEPTED" | "DECLINED" | "MAYBE"
): string {
  if (response === "ACCEPTED") return "is coming";
  if (response === "DECLINED") return "is not coming";
  return "might come";
}

/** Badge classes on guest cards in the organiser Guests list. */
export function organizerRsvpBadgeClass(status: OrganizerRsvpStatus): string {
  switch (status) {
    case "ACCEPTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "DECLINED":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "MAYBE":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "CHECKED_IN":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "OPENED":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}
