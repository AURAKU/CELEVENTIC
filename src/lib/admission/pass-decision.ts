import type { GuestPassStatus } from "@prisma/client";
import type { ResolvedAdmissionSettings } from "@/lib/admission/admission-settings";

/**
 * The admission decision engine.
 *
 * Deliberately pure: the same function decides online (server, inside the
 * admit transaction) and offline (browser, against the cached package). One
 * engine means an offline gate can never be more permissive than the online
 * one — the only difference is that offline results are written as
 * PENDING_SYNC and reconciled later.
 */

export type AdmissionOutcome =
  | "ADMIT"
  | "PARTIAL_ADMIT"
  | "ALREADY_ADMITTED"
  | "RE_ENTRY"
  | "DENY"
  | "REVIEW";

/** Traffic-light tone for the scanner result screen. */
export type AdmissionTone = "green" | "amber" | "red";

export type AdmissionReasonCode =
  | "OK"
  | "OK_PARTIAL"
  | "OK_RE_ENTRY"
  | "ALREADY_ADMITTED"
  | "DUPLICATE_BLOCKED"
  | "ALLOWANCE_EXCEEDED"
  | "PARTIAL_NOT_ALLOWED"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "REVOKED"
  | "REISSUED"
  | "WRONG_EVENT"
  | "MANUAL_CODE_DISABLED"
  | "OFFLINE_DISABLED"
  | "OFFLINE_PACKAGE_STALE"
  | "NEEDS_REVIEW"
  | "NOT_FOUND";

export interface PassSnapshot {
  eventId: string;
  status: GuestPassStatus;
  partySize: number;
  admittedCount: number;
  expiresAt?: Date | null;
  firstAdmittedAt?: Date | null;
  lastAdmittedAt?: Date | null;
}

export interface AdmissionContext {
  /** Gate the operator selected; a mismatch is always fatal. */
  eventId: string;
  now: Date;
  /** Heads the operator is admitting on this scan. Defaults to the remainder. */
  requestedQuantity?: number;
  source: "qr" | "manual_code";
  offline?: boolean;
  /** Age of the cached offline package, in minutes. */
  offlinePackageAgeMinutes?: number;
}

export interface AdmissionDecision {
  outcome: AdmissionOutcome;
  tone: AdmissionTone;
  reason: AdmissionReasonCode;
  /** Operator-facing message. Never contains secrets or raw ids. */
  message: string;
  /** Heads this scan admits. Zero for every non-admitting outcome. */
  admitQuantity: number;
  resultingAdmittedCount: number;
  resultingStatus: GuestPassStatus;
  /** True when the scanner must ask the operator to confirm before writing. */
  requiresConfirmation: boolean;
}

function deny(
  reason: AdmissionReasonCode,
  message: string,
  pass: PassSnapshot,
  tone: AdmissionTone = "red"
): AdmissionDecision {
  return {
    outcome: reason === "NEEDS_REVIEW" ? "REVIEW" : "DENY",
    tone,
    reason,
    message,
    admitQuantity: 0,
    resultingAdmittedCount: pass.admittedCount,
    resultingStatus: pass.status,
  requiresConfirmation: false,
  };
}

/** Effective validity window: explicit pass expiry, then the event window. */
export function resolveValidity(
  pass: PassSnapshot,
  settings: ResolvedAdmissionSettings
): { from: Date | null; until: Date | null } {
  const until = pass.expiresAt ?? settings.validUntil ?? null;
  return { from: settings.validFrom ?? null, until };
}

export function decideAdmission(
  pass: PassSnapshot,
  settings: ResolvedAdmissionSettings,
  ctx: AdmissionContext
): AdmissionDecision {
  if (pass.eventId !== ctx.eventId) {
    return deny(
      "WRONG_EVENT",
      "This pass belongs to a different celebration. Ask for a pass issued for this gate.",
      pass
    );
  }

  if (ctx.source === "manual_code" && !settings.manualCodeEnabled) {
    return deny(
      "MANUAL_CODE_DISABLED",
      "Manual admission codes are turned off for this event. Please scan the QR.",
      pass
    );
  }

  if (ctx.offline) {
    if (!settings.offlineAdmissionEnabled) {
      return deny("OFFLINE_DISABLED", "Offline admission is disabled for this event.", pass);
    }
    if (
      typeof ctx.offlinePackageAgeMinutes === "number" &&
      ctx.offlinePackageAgeMinutes > settings.offlinePackageTtlMinutes
    ) {
      return deny(
        "OFFLINE_PACKAGE_STALE",
        "This device's offline guest list has expired. Reconnect to refresh before admitting.",
        pass
      );
    }
  }

  switch (pass.status) {
    case "REVOKED":
      return deny("REVOKED", "This pass was revoked and cannot be used for entry.", pass);
    case "REISSUED":
      return deny(
        "REISSUED",
        "This is an old copy of the pass. The guest was sent a replacement — ask for the latest one.",
        pass
      );
    case "EXPIRED":
      return deny("EXPIRED", "This pass has expired.", pass);
    case "CONFLICT":
    case "MANUAL_REVIEW":
      return deny(
        "NEEDS_REVIEW",
        "This pass is flagged for organiser review. Please direct the guest to the host desk.",
        pass,
        "amber"
      );
    default:
      break;
  }

  const { from, until } = resolveValidity(pass, settings);
  if (from && ctx.now < from) {
    return deny("NOT_YET_VALID", "Entry has not opened yet for this pass.", pass, "amber");
  }
  if (until && ctx.now > until) {
    return deny("EXPIRED", "This pass has expired.", pass);
  }

  const allowance = Math.max(0, pass.partySize);
  const alreadyIn = Math.max(0, Math.min(pass.admittedCount, allowance));
  const remaining = Math.max(0, allowance - alreadyIn);

  if (remaining === 0) {
    // Whole party is inside. Re-entry and duplicate policy decide what happens.
    if (settings.allowReEntry) {
      const withinWindow =
        settings.reEntryWindowMinutes == null ||
        !pass.lastAdmittedAt ||
        ctx.now.getTime() - pass.lastAdmittedAt.getTime() <=
          settings.reEntryWindowMinutes * 60_000;
      if (withinWindow) {
        return {
          outcome: "RE_ENTRY",
          tone: "green",
          reason: "OK_RE_ENTRY",
          message: "Re-entry allowed. Welcome back.",
          admitQuantity: 0,
          resultingAdmittedCount: alreadyIn,
          resultingStatus: "ADMITTED",
          requiresConfirmation: settings.requireScannerConfirmation && !settings.fastAdmissionMode,
        };
      }
      return deny(
        "DUPLICATE_BLOCKED",
        "The re-entry window for this pass has closed. Please check with the host desk.",
        pass,
        "amber"
      );
    }

    if (settings.duplicatePolicy === "ALLOW") {
      return {
        outcome: "ALREADY_ADMITTED",
        tone: "amber",
        reason: "ALREADY_ADMITTED",
        message: "This party is already inside. Entry allowed by event policy.",
        admitQuantity: 0,
        resultingAdmittedCount: alreadyIn,
        resultingStatus: "ADMITTED",
        requiresConfirmation: false,
      };
    }

    return {
      outcome: "ALREADY_ADMITTED",
      tone: settings.duplicatePolicy === "WARN" ? "amber" : "red",
      reason: settings.duplicatePolicy === "WARN" ? "ALREADY_ADMITTED" : "DUPLICATE_BLOCKED",
      message:
        settings.duplicatePolicy === "WARN"
          ? "This party has already been admitted. Nothing was counted again."
          : "Already admitted. This pass cannot be used again.",
      admitQuantity: 0,
      resultingAdmittedCount: alreadyIn,
      resultingStatus: "ADMITTED",
      requiresConfirmation: false,
    };
  }

  const requested = Math.max(1, Math.trunc(ctx.requestedQuantity ?? remaining));

  if (requested > remaining) {
    return deny(
      "ALLOWANCE_EXCEEDED",
      `This pass admits ${allowance} guest${allowance === 1 ? "" : "s"} and ${remaining} ` +
        `${remaining === 1 ? "place remains" : "places remain"}. Admit fewer, or send the extra guests to the host desk.`,
      pass,
      "amber"
    );
  }

  const isPartial = requested < remaining;
  if (isPartial && !settings.allowPartialArrival) {
    return deny(
      "PARTIAL_NOT_ALLOWED",
      "This event admits the whole party together. Please wait for everyone before scanning.",
      pass,
      "amber"
    );
  }

  const resulting = alreadyIn + requested;
  const complete = resulting >= allowance;

  return {
    outcome: complete && !isPartial && alreadyIn === 0 ? "ADMIT" : complete ? "ADMIT" : "PARTIAL_ADMIT",
    tone: "green",
    reason: complete ? "OK" : "OK_PARTIAL",
    message: complete
      ? `Admitted — ${requested} of ${allowance} guest${allowance === 1 ? "" : "s"}. Welcome!`
      : `Admitted ${requested} of ${allowance}. ${allowance - resulting} still to arrive.`,
    admitQuantity: requested,
    resultingAdmittedCount: resulting,
    resultingStatus: complete ? "ADMITTED" : "PARTIALLY_ADMITTED",
    requiresConfirmation: settings.requireScannerConfirmation && !settings.fastAdmissionMode,
  };
}

/** Convenience for the not-found path so every caller emits the same shape. */
export function notFoundDecision(source: AdmissionContext["source"]): AdmissionDecision {
  return {
    outcome: "DENY",
    tone: "red",
    reason: "NOT_FOUND",
    message:
      source === "manual_code"
        ? "No pass matches that code for this event. Check the digits and try again."
        : "No Celeventic entry pass matches this QR.",
    admitQuantity: 0,
    resultingAdmittedCount: 0,
    resultingStatus: "ACTIVE",
    requiresConfirmation: false,
  };
}
