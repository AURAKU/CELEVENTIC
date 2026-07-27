import type {
  AdmissionDuplicatePolicy,
  EventAdmissionSettings,
  PortalUnlockPolicy,
} from "@prisma/client";
import { SHORT_CODE_LENGTH } from "@/lib/admission/pass-code";

/**
 * Resolved admission policy.
 *
 * Events without an `EventAdmissionSettings` row fall back to these defaults,
 * which reproduce the pre-pass behaviour: the entry pass stays off until an
 * organiser turns `qrAdmissionEnabled` on.
 */

export interface ResolvedAdmissionSettings {
  qrAdmissionEnabled: boolean;
  qrRequiredForEntry: boolean;
  manualCodeEnabled: boolean;
  manualCodeLength: number;
  offlineAdmissionEnabled: boolean;

  displayPassOnInvitation: boolean;
  allowPassDownload: boolean;
  allowPassPrint: boolean;
  showPartySizeOnPass: boolean;
  showTableOnPass: boolean;
  showSeatOnPass: boolean;
  hideSeatingUntilAdmitted: boolean;
  passInstructions: string | null;

  allowPartialArrival: boolean;
  allowSeparateArrival: boolean;
  allowReEntry: boolean;
  reEntryWindowMinutes: number | null;

  requireScannerConfirmation: boolean;
  fastAdmissionMode: boolean;
  requireOperatorAuth: boolean;

  validFrom: Date | null;
  validUntil: Date | null;
  validityLeadHours: number;
  validityTrailHours: number;
  offlinePackageTtlMinutes: number;

  manualCodeAttemptLimit: number;
  manualCodeAttemptWindowSeconds: number;
  duplicatePolicy: AdmissionDuplicatePolicy;
  portalUnlockPolicy: PortalUnlockPolicy;
}

export const ADMISSION_SETTINGS_DEFAULTS: ResolvedAdmissionSettings = {
  qrAdmissionEnabled: false,
  qrRequiredForEntry: true,
  manualCodeEnabled: true,
  manualCodeLength: SHORT_CODE_LENGTH,
  offlineAdmissionEnabled: true,

  displayPassOnInvitation: true,
  allowPassDownload: true,
  allowPassPrint: true,
  showPartySizeOnPass: true,
  showTableOnPass: false,
  showSeatOnPass: false,
  hideSeatingUntilAdmitted: true,
  passInstructions: null,

  allowPartialArrival: true,
  allowSeparateArrival: true,
  allowReEntry: false,
  reEntryWindowMinutes: null,

  requireScannerConfirmation: false,
  fastAdmissionMode: false,
  requireOperatorAuth: true,

  validFrom: null,
  validUntil: null,
  validityLeadHours: 12,
  validityTrailHours: 12,
  offlinePackageTtlMinutes: 720,

  manualCodeAttemptLimit: 10,
  manualCodeAttemptWindowSeconds: 300,
  duplicatePolicy: "BLOCK",
  portalUnlockPolicy: "ON_FIRST_ADMISSION",
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Merge a stored settings row with the defaults and derive the validity window
 * from the event date when the organiser has not pinned explicit timestamps.
 */
export function resolveAdmissionSettings(
  row: EventAdmissionSettings | null | undefined,
  eventStartDate?: Date | null
): ResolvedAdmissionSettings {
  const base: ResolvedAdmissionSettings = row
    ? {
        qrAdmissionEnabled: row.qrAdmissionEnabled,
        qrRequiredForEntry: row.qrRequiredForEntry,
        manualCodeEnabled: row.manualCodeEnabled,
        manualCodeLength: row.manualCodeLength,
        offlineAdmissionEnabled: row.offlineAdmissionEnabled,

        displayPassOnInvitation: row.displayPassOnInvitation,
        allowPassDownload: row.allowPassDownload,
        allowPassPrint: row.allowPassPrint,
        showPartySizeOnPass: row.showPartySizeOnPass,
        showTableOnPass: row.showTableOnPass,
        showSeatOnPass: row.showSeatOnPass,
        hideSeatingUntilAdmitted: row.hideSeatingUntilAdmitted,
        passInstructions: row.passInstructions,

        allowPartialArrival: row.allowPartialArrival,
        allowSeparateArrival: row.allowSeparateArrival,
        allowReEntry: row.allowReEntry,
        reEntryWindowMinutes: row.reEntryWindowMinutes,

        requireScannerConfirmation: row.requireScannerConfirmation,
        fastAdmissionMode: row.fastAdmissionMode,
        requireOperatorAuth: row.requireOperatorAuth,

        validFrom: row.validFrom,
        validUntil: row.validUntil,
        validityLeadHours: row.validityLeadHours,
        validityTrailHours: row.validityTrailHours,
        offlinePackageTtlMinutes: row.offlinePackageTtlMinutes,

        manualCodeAttemptLimit: row.manualCodeAttemptLimit,
        manualCodeAttemptWindowSeconds: row.manualCodeAttemptWindowSeconds,
        duplicatePolicy: row.duplicatePolicy,
        portalUnlockPolicy: row.portalUnlockPolicy,
      }
    : { ...ADMISSION_SETTINGS_DEFAULTS };

  if (eventStartDate) {
    const start = eventStartDate.getTime();
    if (!base.validFrom) base.validFrom = new Date(start - base.validityLeadHours * HOUR_MS);
    if (!base.validUntil) base.validUntil = new Date(start + base.validityTrailHours * HOUR_MS);
  }

  return base;
}

/** Fields an organiser may write through the settings API. */
export type AdmissionSettingsPatch = Partial<
  Omit<ResolvedAdmissionSettings, "validFrom" | "validUntil"> & {
    validFrom: Date | null;
    validUntil: Date | null;
  }
>;
