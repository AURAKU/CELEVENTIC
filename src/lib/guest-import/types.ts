import type {
  GuestImportRowDecision,
  GuestImportRowStatus,
  GuestPartyType,
} from "@prisma/client";

/**
 * Bulk Guest Import — shared vocabulary.
 *
 * Everything in `src/lib/guest-import/*` is pure: no Prisma, no network, no
 * clock. That is deliberate — parsing, mapping, suggestion and duplicate rules
 * are the parts a mis-import would hurt most, so they are unit-testable in
 * isolation and reused verbatim by the API, the background job and the tests.
 */

/** Canonical destination fields a source column can be mapped onto. */
export const ImportField = {
  NAME: "name",
  EMAIL: "email",
  PHONE: "phone",
  PARTY_SIZE: "partySize",
  PARTY_TYPE: "partyType",
  MEMBER_NAMES: "memberNames",
  GROUP_NAME: "groupName",
  TABLE_NUMBER: "tableNumber",
  SEAT_LABEL: "seatLabel",
  NOTES: "notes",
  /** Explicitly ignore this column. */
  IGNORE: "ignore",
} as const;

export type ImportField = (typeof ImportField)[keyof typeof ImportField];

export const MAPPABLE_FIELDS: ImportField[] = [
  ImportField.NAME,
  ImportField.EMAIL,
  ImportField.PHONE,
  ImportField.PARTY_SIZE,
  ImportField.PARTY_TYPE,
  ImportField.MEMBER_NAMES,
  ImportField.GROUP_NAME,
  ImportField.TABLE_NUMBER,
  ImportField.SEAT_LABEL,
  ImportField.NOTES,
];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  name: "Guest / invitation name",
  email: "Email (optional)",
  phone: "Phone (optional)",
  partySize: "Party allowance",
  partyType: "Invitation type",
  memberNames: "Party member names",
  groupName: "Group / table group",
  tableNumber: "Table",
  seatLabel: "Seat",
  notes: "Notes",
  ignore: "Do not import",
};

/** Column index → field. Absent index means "not yet decided". */
export type ColumnMapping = Record<number, ImportField>;

export interface ParsedTable {
  /** Header cells when the first row was detected as a header, else null. */
  headers: string[] | null;
  /** Body rows, header excluded. Ragged rows are padded to `columnCount`. */
  rows: string[][];
  columnCount: number;
  /** Delimiter that won the sniff, for display in the mapping UI. */
  delimiter?: string;
}

export type IssueSeverity = "error" | "warning" | "info";

export interface RowIssue {
  code: RowIssueCode;
  severity: IssueSeverity;
  field?: ImportField;
  message: string;
}

export const RowIssueCode = {
  MISSING_NAME: "MISSING_NAME",
  NAME_TOO_SHORT: "NAME_TOO_SHORT",
  NAME_LOOKS_LIKE_HEADER: "NAME_LOOKS_LIKE_HEADER",
  NAME_TRUNCATED: "NAME_TRUNCATED",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_PHONE: "INVALID_PHONE",
  PHONE_NORMALISED: "PHONE_NORMALISED",
  PARTY_SIZE_INVALID: "PARTY_SIZE_INVALID",
  PARTY_SIZE_CAPPED: "PARTY_SIZE_CAPPED",
  ALLOWANCE_NEEDS_CONFIRMATION: "ALLOWANCE_NEEDS_CONFIRMATION",
  TYPE_SUGGESTED: "TYPE_SUGGESTED",
  DUPLICATE_IN_FILE: "DUPLICATE_IN_FILE",
  DUPLICATE_EXISTING_GUEST: "DUPLICATE_EXISTING_GUEST",
  DUPLICATE_EXISTING_INVITATION: "DUPLICATE_EXISTING_INVITATION",
  SEAT_CONFLICT: "SEAT_CONFLICT",
  FORMULA_STRIPPED: "FORMULA_STRIPPED",
  EXTRA_COLUMNS_IGNORED: "EXTRA_COLUMNS_IGNORED",
} as const;

export type RowIssueCode = (typeof RowIssueCode)[keyof typeof RowIssueCode];

/** A row after mapping + normalisation, before any database decision. */
export interface NormalizedRow {
  rowIndex: number;
  /**
   * Verbatim source cells, positionally indexed. Positional (not header-keyed)
   * so an organiser can change the column mapping and have every row re-derived
   * without re-uploading — and so duplicate headers cannot collapse two columns.
   */
  raw: string[];
  name: string;
  email: string | null;
  phone: string | null;
  rawPhone: string | null;
  partyType: GuestPartyType;
  partySize: number;
  memberNames: string[];
  groupName: string | null;
  tableNumber: string | null;
  seatLabel: string | null;
  notes: string | null;
  status: GuestImportRowStatus;
  decision: GuestImportRowDecision;
  issues: RowIssue[];
  duplicateOfRowIndex: number | null;
  duplicateOfGuestId: string | null;
  duplicateOfInvitationId: string | null;
}

/** Organiser choices captured on the batch, applied at generation time. */
export interface ImportOptions {
  /** Template/design applied to every generated invitation. */
  templateId?: string | null;
  /** Personal message stamped on each invitation. */
  message?: string | null;
  /** Allowance used when a row does not state one. */
  defaultPartySize: number;
  /** Hard ceiling so a stray "50" in a spreadsheet cannot open the gate. */
  maxPartySize: number;
  /** Issue a Guest Entry Pass (QR + admission code) per invitation. */
  issueEntryPass: boolean;
  /** Turn the Place Card feature on for generated invitations. */
  enablePlaceCard: boolean;
  /** Apply table/seat columns to the event's seating plan. */
  applySeating: boolean;
  /** Seating plan to write assignments into; null = the event's first plan. */
  seatingPlanId?: string | null;
  /** Normalise local Ghana numbers to +233 E.164. */
  normalizeGhanaPhones: boolean;
  /** Validate emails; invalid ones become warnings, never blockers. */
  validateEmails: boolean;
  /** Publish generated invitations immediately (ACTIVE) or leave DRAFT. */
  publishImmediately: boolean;
  /** Channels to queue after generation. Empty = generate only. */
  deliveryChannels: ("EMAIL" | "SMS" | "WHATSAPP")[];
  /** Default decision applied to detected duplicates until reviewed. */
  duplicatePolicy: "REVIEW" | "SKIP" | "CREATE_ANYWAY";
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  templateId: null,
  message: null,
  defaultPartySize: 1,
  maxPartySize: 20,
  issueEntryPass: true,
  enablePlaceCard: true,
  applySeating: false,
  seatingPlanId: null,
  normalizeGhanaPhones: true,
  validateEmails: true,
  publishImmediately: true,
  deliveryChannels: [],
  duplicatePolicy: "REVIEW",
};

/** Rows generated per background-job pass. Keeps each tick short and resumable. */
export const GENERATION_CHUNK_SIZE = 25;

/** Hard ceiling on a single import so one paste cannot exhaust the worker. */
export const MAX_IMPORT_ROWS = 5000;

/** Upload ceiling — comfortably above a 5,000-row guest list. */
export const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;

export function mergeImportOptions(partial?: Partial<ImportOptions> | null): ImportOptions {
  return { ...DEFAULT_IMPORT_OPTIONS, ...(partial ?? {}) };
}
