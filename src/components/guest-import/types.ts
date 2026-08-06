/** Shared client-side shapes for the Bulk Guest Import screens. */

export interface ImportRowView {
  id: string;
  rowIndex: number;
  name: string;
  email: string | null;
  phone: string | null;
  partyType: "INDIVIDUAL" | "COUPLE" | "PLUS_GUEST" | "FAMILY" | "GROUP";
  partySize: number;
  groupName: string | null;
  tableNumber: string | null;
  seatLabel: string | null;
  notes: string | null;
  status: "READY" | "NEEDS_REVIEW" | "DUPLICATE" | "INVALID" | "SKIPPED" | "GENERATING" | "GENERATED" | "FAILED";
  decision: "CREATE" | "SKIP" | "MERGE_INTO_EXISTING" | "UPDATE_EXISTING";
  issues: { code: string; severity: "error" | "warning" | "info"; message: string }[] | null;
  duplicateOfRowIndex: number | null;
  error: string | null;
}

export interface ImportBatchView {
  id: string;
  eventId: string;
  label: string | null;
  mode: string;
  source: string;
  status: string;
  fileName: string | null;
  detectedHeaders: string[] | null;
  columnMapping: Record<string, string> | null;
  options: Record<string, unknown> | null;
  totalRows: number;
  readyRows: number;
  reviewRows: number;
  duplicateRows: number;
  invalidRows: number;
  skippedRows: number;
  generatedRows: number;
  failedRows: number;
  generatedHeads: number;
  createdAt: string;
}

export interface ColumnSuggestionView {
  index: number;
  header: string | null;
  field: string;
  confidence: number;
  sample: string[];
}

export interface BatchProgress {
  batch: ImportBatchView;
  rows: Record<string, number>;
  deliveries: Record<string, number>;
  /** Rows that confirming right now would create — skips already excluded. */
  pendingRows: number;
  /** Total heads those rows would admit at the gate. */
  pendingHeads: number;
  /** Duplicates still waiting on a create-or-skip decision. */
  unreviewedDuplicates: number;
  percent: number;
  remaining: number;
  finished: boolean;
}

export const PARTY_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  COUPLE: "Couple",
  PLUS_GUEST: "Plus guest",
  FAMILY: "Family",
  GROUP: "Group",
};

export const STATUS_LABELS: Record<string, string> = {
  READY: "Ready",
  NEEDS_REVIEW: "Needs review",
  DUPLICATE: "Possible duplicate",
  INVALID: "Cannot import",
  SKIPPED: "Skipped",
  GENERATING: "Creating",
  GENERATED: "Created",
  FAILED: "Failed",
};

export const IMPORT_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Guest name" },
  { value: "email", label: "Email (optional)" },
  { value: "phone", label: "Phone (optional)" },
  { value: "partySize", label: "People admitted" },
  { value: "partyType", label: "Invitation type" },
  { value: "memberNames", label: "Party member names" },
  { value: "tags", label: "Tags (organizer only)" },
  { value: "groupName", label: "Group" },
  { value: "tableNumber", label: "Table" },
  { value: "seatLabel", label: "Seat" },
  { value: "notes", label: "Notes" },
  { value: "ignore", label: "Do not import" },
];
