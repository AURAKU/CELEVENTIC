/**
 * Pure vendor/team pass capacity arithmetic — unit-tested without Prisma.
 */

export type VendorAdmitMode = "one" | "quantity" | "full_team";

export interface VendorCapacityState {
  teamCapacity: number;
  admittedCount: number;
  status: string;
}

export function remainingCapacity(state: VendorCapacityState): number {
  return Math.max(0, Math.trunc(state.teamCapacity) - Math.trunc(state.admittedCount));
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

export function resolveAdmitQuantity(
  state: VendorCapacityState,
  mode: VendorAdmitMode,
  requestedQuantity?: number
): { ok: true; quantity: number } | { ok: false; error: string } {
  if (["REVOKED", "EXPIRED", "ARCHIVED", "PAUSED"].includes(state.status)) {
    return { ok: false, error: `Pass is ${state.status.toLowerCase()}.` };
  }
  const remaining = remainingCapacity(state);
  if (remaining <= 0) {
    return { ok: false, error: "Team capacity reached." };
  }

  if (mode === "one") {
    return { ok: true, quantity: 1 };
  }
  if (mode === "full_team") {
    return { ok: true, quantity: remaining };
  }
  const qty = Math.trunc(requestedQuantity ?? 0);
  if (qty < 1) return { ok: false, error: "Select how many members are arriving." };
  if (qty > remaining) {
    return {
      ok: false,
      error: `Only ${remaining} entr${remaining === 1 ? "y" : "ies"} remain.`,
    };
  }
  return { ok: true, quantity: qty };
}

export function clampTeamCapacity(next: number, alreadyAdmitted: number): number {
  return Math.max(Math.trunc(alreadyAdmitted), Math.max(1, Math.trunc(next)));
}

export const DEFAULT_ACCESS_ZONES = ["Main Entrance", "General Event Area"] as const;

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
