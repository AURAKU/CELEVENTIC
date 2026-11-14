export const CELECARD_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "FOLLOW_UP",
  "WON",
  "ARCHIVED",
] as const;

export type CeleCardLeadStatus = (typeof CELECARD_LEAD_STATUSES)[number];

export const CELECARD_LEAD_STATUS_LABEL: Record<CeleCardLeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  FOLLOW_UP: "Follow up",
  WON: "Won",
  ARCHIVED: "Archived",
};

/** Owner-only pipeline copy. Never sent to guests. */
export const CELECARD_LEAD_STATUS_PURPOSE: Record<CeleCardLeadStatus, string> = {
  NEW: "Just arrived. You have not written back yet.",
  CONTACTED: "You reached out. Waiting on their reply.",
  QUALIFIED: "Worth a real conversation or meeting.",
  FOLLOW_UP: "Come back to this person. A 1 day reminder is set.",
  WON: "This connection converted, or the meeting is confirmed.",
  ARCHIVED: "Closed. It leaves the open list.",
};

export function isCeleCardLeadStatus(value: string): value is CeleCardLeadStatus {
  return (CELECARD_LEAD_STATUSES as readonly string[]).includes(value);
}

export function parseCeleCardLeadStatus(value?: string | null): CeleCardLeadStatus | null {
  const status = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return isCeleCardLeadStatus(status) ? status : null;
}

export function normalizeCeleCardLeadStatus(value?: string | null): CeleCardLeadStatus {
  return parseCeleCardLeadStatus(value) ?? "NEW";
}

export type CeleCardLeadFilter = CeleCardLeadStatus | "ALL";

/** Open list hides Archived. Each named chip shows only that stage. */
export function leadStatusBelongsInFilter(status: string | null | undefined, filter: CeleCardLeadFilter) {
  const normalized = normalizeCeleCardLeadStatus(status);
  if (filter === "ALL") return normalized !== "ARCHIVED";
  return normalized === filter;
}

export function emptyLeadFilterCopy(filter: CeleCardLeadFilter, searching: boolean) {
  if (searching) return "No connections match that search.";
  if (filter === "ALL") return "No open connections. Share your CeleYou to start this list.";
  if (filter === "ARCHIVED") return "Nothing archived yet.";
  return `No connections in ${CELECARD_LEAD_STATUS_LABEL[filter]}.`;
}

export function movedLeadStatusCopy(status: CeleCardLeadStatus) {
  return `Moved to ${CELECARD_LEAD_STATUS_LABEL[status]}. ${CELECARD_LEAD_STATUS_PURPOSE[status]}`;
}

export function emptyLeadStatusCounts(): Record<CeleCardLeadStatus, number> {
  return {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    FOLLOW_UP: 0,
    WON: 0,
    ARCHIVED: 0,
  };
}

export function openLeadCount(counts: Record<CeleCardLeadStatus, number>) {
  return CELECARD_LEAD_STATUSES.filter((status) => status !== "ARCHIVED").reduce(
    (sum, status) => sum + (counts[status] || 0),
    0
  );
}
