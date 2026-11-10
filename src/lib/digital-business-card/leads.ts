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
