/**
 * Pure vendor/team pass capacity arithmetic — unit-tested without Prisma.
 *
 * A vendor pass is an access card, not a one-time ticket. `teamCapacity` is the
 * headcount admitted per *entry cycle*; when the cycle fills up, the re-entry
 * policy decides whether the next scan opens a fresh cycle (the card keeps
 * working) or is refused. Every attempt is logged either way.
 */

export type VendorAdmitMode = "one" | "quantity" | "full_team";

export type VendorReentryPolicyValue = "NONE" | "ONE" | "UNLIMITED" | "CUSTOM";

export interface VendorCapacityState {
  teamCapacity: number;
  admittedCount: number;
  status: string;
  /** Absent means legacy single-cycle behaviour (no re-entry). */
  reentryPolicy?: string | null;
  reentryLimit?: number | null;
  reentryUsed?: number | null;
  entryCycle?: number | null;
}

/** Statuses that stop a card outright, no matter how much capacity is left. */
export const TERMINAL_VENDOR_STATUSES = ["REVOKED", "EXPIRED", "ARCHIVED", "PAUSED"] as const;

export function remainingCapacity(state: VendorCapacityState): number {
  return Math.max(0, Math.trunc(state.teamCapacity) - Math.trunc(state.admittedCount));
}

function policyOf(state: VendorCapacityState): VendorReentryPolicyValue {
  const raw = (state.reentryPolicy ?? "NONE").toUpperCase();
  return raw === "ONE" || raw === "UNLIMITED" || raw === "CUSTOM" ? raw : "NONE";
}

export function currentEntryCycle(state: VendorCapacityState): number {
  return Math.max(1, Math.trunc(state.entryCycle ?? 1));
}

/**
 * How many more times this card may re-open after its capacity is used.
 * `remaining: null` means unlimited — the access-card default.
 */
export function reentryAllowance(state: VendorCapacityState): {
  policy: VendorReentryPolicyValue;
  allowed: boolean;
  remaining: number | null;
  used: number;
  limit: number | null;
} {
  const policy = policyOf(state);
  const used = Math.max(0, Math.trunc(state.reentryUsed ?? 0));

  if (policy === "UNLIMITED") {
    return { policy, allowed: true, remaining: null, used, limit: null };
  }
  if (policy === "NONE") {
    return { policy, allowed: false, remaining: 0, used, limit: 0 };
  }
  const limit = policy === "ONE" ? 1 : Math.max(0, Math.trunc(state.reentryLimit ?? 0));
  const remaining = Math.max(0, limit - used);
  return { policy, allowed: remaining > 0, remaining, used, limit };
}

/** True when the pass keeps admitting after its capacity fills (access card). */
export function isMultiEntryPass(state: VendorCapacityState): boolean {
  return reentryAllowance(state).allowed;
}

export function describeReentryPolicy(state: VendorCapacityState): string {
  const allowance = reentryAllowance(state);
  if (allowance.policy === "UNLIMITED") return "Unlimited re-entry";
  if (allowance.policy === "NONE") return "Single visit";
  return `${allowance.remaining} of ${allowance.limit} re-entries left`;
}

export function deriveVendorPassStatus(
  admittedCount: number,
  teamCapacity: number,
  terminal?: "REVOKED" | "EXPIRED" | "ARCHIVED" | "PAUSED" | null
): string {
  if (terminal) return terminal;
  const capacity = Math.max(1, Math.trunc(teamCapacity));
  const admitted = Math.max(0, Math.trunc(admittedCount));
  if (admitted <= 0) return "ACTIVE";
  if (admitted >= capacity) return "ADMITTED";
  return "PARTIALLY_ADMITTED";
}

export type VendorAdmitDecision =
  | {
      ok: true;
      quantity: number;
      /** The card had filled up and this scan re-opened it. */
      startsNewCycle: boolean;
      /** Cycle the resulting admission belongs to. */
      entryCycle: number;
    }
  | { ok: false; error: string };

export function resolveAdmitQuantity(
  state: VendorCapacityState,
  mode: VendorAdmitMode,
  requestedQuantity?: number
): VendorAdmitDecision {
  if ((TERMINAL_VENDOR_STATUSES as readonly string[]).includes(state.status)) {
    return { ok: false, error: `Pass is ${state.status.toLowerCase()}.` };
  }

  const cycle = currentEntryCycle(state);
  const remainingNow = remainingCapacity(state);

  // The card filled up: only a re-entry allowance can open the next cycle.
  if (remainingNow <= 0) {
    const allowance = reentryAllowance(state);
    if (!allowance.allowed) {
      return {
        ok: false,
        error:
          allowance.policy === "NONE"
            ? "Team capacity reached. Re-entry is not enabled on this pass."
            : `Team capacity reached and all ${allowance.limit} re-entries are used.`,
      };
    }
    const capacity = Math.max(1, Math.trunc(state.teamCapacity));
    const quantity = quantityForCycle(mode, capacity, requestedQuantity);
    if (!quantity.ok) return quantity;
    return { ok: true, quantity: quantity.quantity, startsNewCycle: true, entryCycle: cycle + 1 };
  }

  const quantity = quantityForCycle(mode, remainingNow, requestedQuantity);
  if (!quantity.ok) return quantity;
  return { ok: true, quantity: quantity.quantity, startsNewCycle: false, entryCycle: cycle };
}

function quantityForCycle(
  mode: VendorAdmitMode,
  available: number,
  requestedQuantity?: number
): { ok: true; quantity: number } | { ok: false; error: string } {
  if (mode === "one") return { ok: true, quantity: 1 };
  if (mode === "full_team") return { ok: true, quantity: available };

  const qty = Math.trunc(requestedQuantity ?? 0);
  if (qty < 1) return { ok: false, error: "Select how many members are arriving." };
  if (qty > available) {
    return {
      ok: false,
      error: `Only ${available} entr${available === 1 ? "y" : "ies"} remain.`,
    };
  }
  return { ok: true, quantity: qty };
}

export function clampTeamCapacity(next: number, alreadyAdmitted: number): number {
  return Math.max(Math.trunc(alreadyAdmitted), Math.max(1, Math.trunc(next)));
}

export const DEFAULT_ACCESS_ZONES = ["Main Entrance", "General Event Area"] as const;

/** Access-card behaviour offered to hosts when issuing or editing a pass. */
export const VENDOR_ACCESS_MODE_OPTIONS = [
  {
    value: "UNLIMITED",
    label: "Access card · unlimited entries",
    hint: "Scan in and out all event long. Recommended for vendors and crew.",
  },
  {
    value: "CUSTOM",
    label: "Limited re-entries",
    hint: "Card re-opens a set number of times after the team is fully in.",
  },
  {
    value: "NONE",
    label: "Single visit",
    hint: "Stops once the whole team has been admitted once.",
  },
] as const;

export const VENDOR_PASS_TYPE_OPTIONS = [
  { value: "VENDOR", label: "Vendor" },
  { value: "PERFORMER", label: "Performer" },
  { value: "MUSICAL_BAND", label: "Musical Band" },
  { value: "DJ", label: "DJ" },
  { value: "MC", label: "MC" },
  { value: "PHOTOGRAPHER", label: "Photographer" },
  { value: "VIDEOGRAPHER", label: "Videographer" },
  { value: "CATERER", label: "Caterer" },
  { value: "DECORATOR", label: "Decorator" },
  { value: "VENUE_STAFF", label: "Venue Staff" },
  { value: "SECURITY", label: "Security Team" },
  { value: "MEDIA", label: "Media Team" },
  { value: "DRIVER", label: "Driver" },
  { value: "TECHNICAL_CREW", label: "Technical Crew" },
  { value: "PRODUCTION", label: "Production Team" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "SPONSOR", label: "Sponsor" },
  { value: "EXHIBITOR", label: "Exhibitor" },
  { value: "CUSTOM", label: "Other Custom Team" },
] as const;
