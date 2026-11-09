/** RSVP stays open when no deadline is configured. */
export function isRsvpOpen(now: Date, deadline: Date | null | undefined): boolean {
  if (!deadline) return true;
  const closeAt = deadline instanceof Date ? deadline.getTime() : new Date(deadline).getTime();
  if (!Number.isFinite(closeAt)) return true;
  return now.getTime() <= closeAt;
}

export class RsvpClosedError extends Error {
  constructor(deadline: Date) {
    super("RSVPs for this event are closed");
    this.name = "RsvpClosedError";
    this.deadline = deadline;
  }

  deadline: Date;
}
