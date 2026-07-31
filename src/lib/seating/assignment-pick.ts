/**
 * Dual-stage seating helpers — pick ceremony vs reception assignments safely.
 */

export type SeatingPlanTypeValue = "RECEPTION" | "CEREMONY";

export function pickSeatingAssignment<
  T extends { seatingPlan?: { planType?: string | null } | null },
>(assignments: T[] | null | undefined, prefer: SeatingPlanTypeValue = "RECEPTION"): T | null {
  if (!assignments?.length) return null;
  return (
    assignments.find((row) => row.seatingPlan?.planType === prefer) ??
    assignments.find((row) => row.seatingPlan?.planType === "RECEPTION") ??
    assignments[0] ??
    null
  );
}

export function splitSeatingAssignments<
  T extends { seatingPlan?: { planType?: string | null } | null },
>(assignments: T[] | null | undefined): { reception: T | null; ceremony: T | null } {
  const list = assignments ?? [];
  return {
    reception: list.find((row) => row.seatingPlan?.planType === "RECEPTION") ?? null,
    ceremony: list.find((row) => row.seatingPlan?.planType === "CEREMONY") ?? null,
  };
}

/** Prisma include fragment for guest seating with plan type. */
export const seatingAssignmentsWithPlanInclude = {
  seatingAssignments: {
    include: {
      seatingPlan: {
        select: {
          id: true,
          name: true,
          planType: true,
          layout: true,
        },
      },
    },
  },
} as const;
