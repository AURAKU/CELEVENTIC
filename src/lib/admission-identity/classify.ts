/**
 * Invitation-party admission identity classification (pure).
 *
 * Audit unit = one Invitation (party), never unnamed plus-ones or capacity slots.
 */

import { isAdmissionCode, normalizeAdmissionCode } from "@/lib/admission/pass-code";

export type AdmissionIdentityStatus =
  | "COMPLETE"
  | "MISSING_QR"
  | "MISSING_ADMISSION_CODE"
  | "MISSING_INVITATION_LINK"
  | "MISSING_MULTIPLE_FIELDS"
  | "INVALID_CODE"
  | "DUPLICATE_CODE"
  | "DUPLICATE_LINK"
  | "GENERATION_FAILED"
  | "REVOKED"
  | "NEEDS_REVIEW";

export type AdmissionIdentityIssue =
  | "missing_qr"
  | "missing_code"
  | "missing_link"
  | "invalid_code"
  | "duplicate_code"
  | "duplicate_link"
  | "revoked"
  | "expired"
  | "generation_failed";

export interface IdentitySignals {
  uniqueLink: string | null | undefined;
  /** Live GuestPass token / QR present */
  hasLivePass: boolean;
  /** Live GuestPass.code */
  admissionCode: string | null | undefined;
  passStatus: string | null | undefined;
  /** Another invitation on the same event shares this code */
  codeDuplicated?: boolean;
  /** Another invitation shares this uniqueLink (should be impossible under @unique) */
  linkDuplicated?: boolean;
  /** Last ensure/generate attempt failed */
  generationFailed?: boolean;
}

export interface ClassifiedIdentity {
  status: AdmissionIdentityStatus;
  issues: AdmissionIdentityIssue[];
  linkOk: boolean;
  qrOk: boolean;
  codeOk: boolean;
  badges: string[];
}

function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

export function isValidUniqueLink(value: string | null | undefined): boolean {
  if (isBlank(value)) return false;
  const link = value!.trim();
  // Bearer tokens from newUniqueLink / generateToken are reasonably long.
  return link.length >= 8 && !/\s/.test(link);
}

export function isValidAdmissionCodeValue(value: string | null | undefined): boolean {
  if (isBlank(value)) return false;
  const digits = normalizeAdmissionCode(value!);
  return isAdmissionCode(digits);
}

const LIVE_PASS = new Set([
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
]);

export function classifyAdmissionIdentity(input: IdentitySignals): ClassifiedIdentity {
  const issues: AdmissionIdentityIssue[] = [];

  const linkOk = isValidUniqueLink(input.uniqueLink) && !input.linkDuplicated;
  if (!isValidUniqueLink(input.uniqueLink)) issues.push("missing_link");
  if (input.linkDuplicated) issues.push("duplicate_link");

  const revoked = input.passStatus === "REVOKED" || input.passStatus === "REISSUED";
  const expired = input.passStatus === "EXPIRED";
  const hasLive = input.hasLivePass && LIVE_PASS.has(input.passStatus ?? "");

  let qrOk = hasLive;
  if (input.generationFailed) {
    issues.push("generation_failed");
    qrOk = false;
  } else if (revoked && !hasLive) {
    issues.push("revoked");
    qrOk = false;
  } else if (expired && !hasLive) {
    issues.push("expired");
    qrOk = false;
  } else if (!hasLive) {
    issues.push("missing_qr");
  }

  const codePresent = isValidAdmissionCodeValue(input.admissionCode);
  let codeOk = codePresent && !input.codeDuplicated;
  if (isBlank(input.admissionCode)) {
    issues.push("missing_code");
  } else if (!codePresent) {
    issues.push("invalid_code");
    codeOk = false;
  }
  if (input.codeDuplicated) {
    issues.push("duplicate_code");
    codeOk = false;
  }

  const badges: string[] = [];
  if (issues.includes("missing_qr")) badges.push("Missing QR");
  if (issues.includes("missing_code")) badges.push("Missing Code");
  if (issues.includes("missing_link")) badges.push("Missing Link");
  if (issues.includes("invalid_code")) badges.push("Invalid Code");
  if (issues.includes("duplicate_code") || issues.includes("duplicate_link")) {
    badges.push("Possible Duplicate");
  }
  if (issues.includes("revoked") || issues.includes("expired")) badges.push("Needs Review");
  if (issues.includes("generation_failed")) badges.push("Needs Review");

  let status: AdmissionIdentityStatus = "COMPLETE";
  if (issues.includes("generation_failed")) status = "GENERATION_FAILED";
  else if (issues.includes("duplicate_code")) status = "DUPLICATE_CODE";
  else if (issues.includes("duplicate_link")) status = "DUPLICATE_LINK";
  else if (issues.includes("revoked")) status = "REVOKED";
  else if (issues.includes("invalid_code")) status = "INVALID_CODE";
  else {
    const missing = [
      issues.includes("missing_qr"),
      issues.includes("missing_code"),
      issues.includes("missing_link"),
    ].filter(Boolean).length;
    if (missing >= 2) status = "MISSING_MULTIPLE_FIELDS";
    else if (issues.includes("missing_qr")) status = "MISSING_QR";
    else if (issues.includes("missing_code")) status = "MISSING_ADMISSION_CODE";
    else if (issues.includes("missing_link")) status = "MISSING_INVITATION_LINK";
    else if (issues.includes("expired")) status = "NEEDS_REVIEW";
    else if (issues.length > 0) status = "NEEDS_REVIEW";
    else status = "COMPLETE";
  }

  if (status === "COMPLETE") badges.push("Complete");
  else if (!badges.includes("Needs Review") && status === "NEEDS_REVIEW") {
    badges.push("Needs Review");
  }

  return { status, issues, linkOk, qrOk, codeOk, badges };
}

/** Filters that organisers pick in the audit workspace. */
export type AuditIssueFilter =
  | "all_incomplete"
  | "missing_qr"
  | "missing_code"
  | "missing_link"
  | "missing_both_qr_code"
  | "invalid_code"
  | "duplicate_code"
  | "duplicate_link"
  | "suspected_duplicate"
  | "party_mix"
  | "revoked"
  | "expired"
  | "generation_failed"
  | "complete"
  | "needs_review";

export function matchesIssueFilter(
  classified: ClassifiedIdentity,
  filter: AuditIssueFilter | null | undefined
): boolean {
  if (!filter || filter === "all_incomplete") {
    return classified.status !== "COMPLETE";
  }
  switch (filter) {
    case "complete":
      return classified.status === "COMPLETE";
    case "missing_qr":
      return classified.issues.includes("missing_qr");
    case "missing_code":
      return classified.issues.includes("missing_code");
    case "missing_link":
      return classified.issues.includes("missing_link");
    case "missing_both_qr_code":
      return (
        classified.issues.includes("missing_qr") && classified.issues.includes("missing_code")
      );
    case "invalid_code":
      return classified.issues.includes("invalid_code");
    case "duplicate_code":
      return classified.issues.includes("duplicate_code");
    case "duplicate_link":
      return classified.issues.includes("duplicate_link");
    case "suspected_duplicate":
      return (
        classified.issues.includes("duplicate_code") ||
        classified.issues.includes("duplicate_link")
      );
    case "party_mix":
      // Applied in the audit service via leakage invitation id set.
      return true;
    case "revoked":
      return classified.issues.includes("revoked");
    case "expired":
      return classified.issues.includes("expired");
    case "generation_failed":
      return classified.issues.includes("generation_failed");
    case "needs_review":
      return classified.status === "NEEDS_REVIEW" || classified.status === "REVOKED";
    default:
      return true;
  }
}

/** Normalize free-text audit search (case, spaces, punctuation, phone digits). */
export function normalizeAuditQuery(raw: string): {
  text: string;
  digits: string;
  tokens: string[];
} {
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const digits = raw.replace(/\D+/g, "");
  const tokens = text
    .replace(/[^\p{L}\p{N}\s@.+_-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
  return { text, digits, tokens };
}
