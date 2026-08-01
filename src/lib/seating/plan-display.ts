/**
 * Display labels for seating plan types.
 * Internal Prisma enum stays RECEPTION for backward compatibility.
 */

import type { SeatingPlanKind } from "@/lib/seating/studio-types";

export type SeatingPlanTypeLike = SeatingPlanKind | "RECEPTION" | "CEREMONY" | string;

/** Organiser + guest facing plan title. */
export function seatingPlanDisplayName(planType?: SeatingPlanTypeLike | null): string {
  if (planType === "CEREMONY") return "Main Ceremony";
  return "Reception";
}

/** Default draft plan name when creating a plan. */
export function seatingPlanDefaultName(planType?: SeatingPlanTypeLike | null): string {
  if (planType === "CEREMONY") return "Main ceremony";
  return "Reception";
}

/** Short tab / toggle label. */
export function seatingPlanShortLabel(planType?: SeatingPlanTypeLike | null): string {
  if (planType === "CEREMONY") return "Main Ceremony";
  return "Reception";
}

/** Capacity metric label in the studio header. */
export function seatingCapacityLabel(planType?: SeatingPlanTypeLike | null): string {
  if (planType === "CEREMONY") return "Ceremony chairs";
  return "Reception capacity";
}

/** Guest-facing stage eyebrow on the seating card. */
export function seatingStageEyebrow(planType?: SeatingPlanTypeLike | null): string {
  if (planType === "CEREMONY") return "Ceremony";
  return "Reception";
}
