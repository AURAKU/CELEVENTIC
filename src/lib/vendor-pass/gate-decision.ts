/**
 * Shape vendor/team admit outcomes into the guest gate AdmissionDecision
 * contract so EntryPassGate can reuse the same prompt UI without mixing
 * vendor records into guest invitations.
 */

import type { AdmissionDecision, AdmissionOutcome, AdmissionReasonCode } from "@/lib/admission/pass-decision";
import { remainingCapacity, type VendorCapacityState } from "@/lib/vendor-pass/capacity";

export type VendorGatePassView = VendorCapacityState & {
  title: string;
  vendorName: string;
  admissionCode: string;
  entryMode?: string;
  accessZones?: string[];
  passType?: string;
  contactName?: string | null;
  vehicleRegistration?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
};

export function vendorGateDecision(input: {
  pass: VendorGatePassView;
  ok: boolean;
  dryRun?: boolean;
  quantity?: number;
  error?: string;
  quantityConfirmed?: boolean;
}): AdmissionDecision {
  const remaining = remainingCapacity(input.pass);
  const entryMode = input.pass.entryMode ?? "INDIVIDUAL_ENTRY";

  if (!input.ok) {
    const reason = mapVendorDenyReason(input.error);
    return {
      outcome: input.pass.admittedCount >= input.pass.teamCapacity ? "ALREADY_ADMITTED" : "DENY",
      tone: reason === "ALREADY_ADMITTED" ? "amber" : "red",
      reason,
      message: input.error ?? "Vendor pass denied.",
      admitQuantity: 0,
      resultingAdmittedCount: input.pass.admittedCount,
      resultingStatus: input.pass.status as AdmissionDecision["resultingStatus"],
      requiresConfirmation: false,
      allowance: input.pass.teamCapacity,
      remaining,
      requiresQuantityConfirmation: false,
    };
  }

  const quantity = Math.max(1, input.quantity ?? 1);

  // Dry-run previews: ask for quantity / full-team confirm when the pass mode requires it.
  if (input.dryRun) {
    if (entryMode === "SELECT_QUANTITY" && remaining > 1 && !input.quantityConfirmed) {
      return {
        outcome: "REVIEW",
        tone: "amber",
        reason: "NEEDS_REVIEW",
        message: `${input.pass.title} — ${input.pass.admittedCount} of ${input.pass.teamCapacity} admitted. ${remaining} remaining.`,
        admitQuantity: 0,
        resultingAdmittedCount: input.pass.admittedCount,
        resultingStatus: input.pass.status as AdmissionDecision["resultingStatus"],
        requiresConfirmation: false,
        allowance: input.pass.teamCapacity,
        remaining,
        requiresQuantityConfirmation: true,
      };
    }
    if (entryMode === "ADMIT_FULL_TEAM" && remaining > 0 && !input.quantityConfirmed) {
      return {
        outcome: "REVIEW",
        tone: "amber",
        reason: "NEEDS_REVIEW",
        message: `Admit all ${remaining} remaining team members for ${input.pass.title}?`,
        admitQuantity: remaining,
        resultingAdmittedCount: input.pass.admittedCount,
        resultingStatus: input.pass.status as AdmissionDecision["resultingStatus"],
        requiresConfirmation: true,
        allowance: input.pass.teamCapacity,
        remaining,
        requiresQuantityConfirmation: false,
      };
    }
    // Individual entry (default): preview one admit.
    return {
      outcome: "REVIEW",
      tone: "amber",
      reason: "NEEDS_REVIEW",
      message: `Ready to admit 1 for ${input.pass.title}. ${input.pass.admittedCount} of ${input.pass.teamCapacity} already in.`,
      admitQuantity: 1,
      resultingAdmittedCount: input.pass.admittedCount,
      resultingStatus: input.pass.status as AdmissionDecision["resultingStatus"],
      requiresConfirmation: true,
      allowance: input.pass.teamCapacity,
      remaining,
      requiresQuantityConfirmation: false,
    };
  }

  const nextCount = input.pass.admittedCount;
  const outcome: AdmissionOutcome =
    nextCount >= input.pass.teamCapacity ? "ADMIT" : "PARTIAL_ADMIT";

  return {
    outcome,
    tone: "green",
    reason: outcome === "ADMIT" ? "OK" : "OK_PARTIAL",
    message:
      nextCount >= input.pass.teamCapacity
        ? `Admitted ${quantity}. Team capacity reached.`
        : `Admitted ${quantity}. ${nextCount} of ${input.pass.teamCapacity} in · ${remaining} remaining.`,
    admitQuantity: quantity,
    resultingAdmittedCount: nextCount,
    resultingStatus: input.pass.status as AdmissionDecision["resultingStatus"],
    requiresConfirmation: false,
    allowance: input.pass.teamCapacity,
    remaining,
    requiresQuantityConfirmation: false,
  };
}

function mapVendorDenyReason(error?: string): AdmissionReasonCode {
  const msg = (error ?? "").toLowerCase();
  if (msg.includes("different event")) return "WRONG_EVENT";
  if (msg.includes("capacity")) return "ALLOWANCE_EXCEEDED";
  if (msg.includes("expired")) return "EXPIRED";
  if (msg.includes("not valid yet")) return "NOT_YET_VALID";
  if (msg.includes("revoked")) return "REVOKED";
  if (msg.includes("paused") || msg.includes("archived")) return "REVOKED";
  if (msg.includes("not found")) return "NOT_FOUND";
  return "NEEDS_REVIEW";
}
