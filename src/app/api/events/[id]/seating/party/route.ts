import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireEventPermission, verifyEventAccess } from "@/lib/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { seatingPlanDefaultName } from "@/lib/seating/plan-display";
import { normalizeStudioLayout } from "@/lib/seating/studio-engine";
import type { StudioGuest } from "@/lib/seating/studio-types";
import {
  SeatingPartyError,
  seatingPartyService,
} from "@/services/seating/seating-party.service";
import { seatingService } from "@/services/seating/seating.service";
import { Prisma, type GuestPassStatus, type SeatingPlanType, type UserRole } from "@prisma/client";
import { z } from "zod";

const LIVE_PASS_STATUSES: GuestPassStatus[] = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
];

const seatingGuestSelect = Prisma.validator<Prisma.GuestSelect>()({
  id: true,
  name: true,
  email: true,
  phone: true,
  qrToken: true,
  status: true,
  plusOnes: true,
  invitationId: true,
  invitation: {
    select: {
      admittedCount: true,
      admissionAllowance: true,
      admissionState: true,
      guestPasses: {
        where: { status: { in: LIVE_PASS_STATUSES } },
        orderBy: { tokenVersion: "desc" as const },
        take: 1,
        select: {
          partySize: true,
          admittedCount: true,
          status: true,
        },
      },
    },
  },
  tagAssignments: {
    orderBy: { tag: { sortOrder: "asc" as const } },
    select: { tag: { select: { id: true, label: true } } },
  },
});

type SeatingGuestRow = Prisma.GuestGetPayload<{ select: typeof seatingGuestSelect }>;

function mapGuestToStudio(guest: SeatingGuestRow): StudioGuest {
  const pass = guest.invitation?.guestPasses[0];
  const allowance = guest.invitation
    ? Math.max(
        1,
        guest.invitation.admissionAllowance ?? pass?.partySize ?? 1 + Math.max(0, guest.plusOnes)
      )
    : 1 + Math.max(0, guest.plusOnes);
  const admittedCount = Math.min(
    allowance,
    Math.max(0, pass?.admittedCount ?? guest.invitation?.admittedCount ?? 0)
  );
  const admissionState =
    admittedCount <= 0
      ? "NOT_ADMITTED"
      : admittedCount >= allowance
        ? "ADMITTED"
        : "PARTIALLY_ADMITTED";

  return {
    id: guest.id,
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    qrToken: guest.qrToken ?? undefined,
    status: guest.status,
    plusOnes: guest.plusOnes,
    invitationId: guest.invitationId,
    partySize: allowance,
    tags: guest.tagAssignments.map((row) => ({
      id: row.tag.id,
      label: row.tag.label,
    })),
    admission: guest.invitation
      ? {
          allowance,
          admittedCount,
          remainingCount: Math.max(0, allowance - admittedCount),
          state: admissionState,
        }
      : null,
  };
}

async function loadStudioGuests(eventId: string): Promise<StudioGuest[]> {
  const rows = await prisma.guest.findMany({
    where: { eventId, archivedAt: null },
    select: seatingGuestSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return rows.map(mapGuestToStudio);
}

async function resolvePlan(eventId: string, planType: SeatingPlanType) {
  const plan = await seatingService.getPlanByType(eventId, planType);
  if (plan) return plan;
  return seatingService.upsertPlan(
    eventId,
    seatingPlanDefaultName(planType),
    { tables: [], status: "draft", planKind: planType },
    planType
  );
}

function partyErrorStatus(code: string): number {
  switch (code) {
    case "PARTY_DOES_NOT_FIT":
    case "COMPANION_HOLD_CONFLICT":
    case "DUPLICATE_SEAT":
      return 409;
    default:
      return 400;
  }
}

function handlePartyError(error: unknown) {
  if (error instanceof SeatingPartyError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: partyErrorStatus(error.code) }
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.errors[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Failed", code: "UNKNOWN" },
    { status: 400 }
  );
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    planType: z.enum(["RECEPTION", "CEREMONY"]).optional().default("RECEPTION"),
    guestId: z.string().min(1),
    tableNumber: z.string().trim().min(1).max(80),
    mode: z.enum(["FULL_PARTY", "SELECTED_ONLY"]),
    confirmPartial: z.boolean().optional(),
    tableOnly: z.boolean().optional(),
    zone: z.string().trim().max(80).optional(),
    seatLabels: z.array(z.string().trim().max(20)).optional(),
    /** Optional unsaved studio tables so assign works before Save Draft. */
    tables: z.array(z.any()).optional(),
  }),
  z.object({
    action: z.literal("move"),
    planType: z.enum(["RECEPTION", "CEREMONY"]).optional().default("RECEPTION"),
    invitationId: z.string().min(1),
    toTableNumber: z.string().trim().min(1).max(80),
    zone: z.string().trim().max(80).optional(),
  }),
  z.object({
    action: z.literal("confirm_split"),
    planType: z.enum(["RECEPTION", "CEREMONY"]).optional().default("RECEPTION"),
    invitationId: z.string().min(1),
    requiredPlaces: z.number().int().min(1).max(500),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("convert_hold"),
    holdId: z.string().min(1),
    guestId: z.string().min(1),
  }),
  z.object({
    action: z.literal("release_holds"),
    planType: z.enum(["RECEPTION", "CEREMONY"]).optional().default("RECEPTION"),
    invitationId: z.string().min(1),
  }),
  z.object({
    action: z.literal("release_hold"),
    holdId: z.string().min(1),
  }),
]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  const planType = (new URL(req.url).searchParams.get("planType") ?? "RECEPTION") as SeatingPlanType;

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const plan = await seatingService.getPlanByType(eventId, planType);
    if (!plan) {
      return NextResponse.json({
        success: true,
        data: { companionHolds: [], partyPlans: [] },
      });
    }

    const [companionHolds, partyPlans] = await Promise.all([
      seatingPartyService.listActiveHolds(plan.id),
      seatingPartyService.listPartyPlans(plan.id),
    ]);

    return NextResponse.json({
      success: true,
      data: { companionHolds, partyPlans },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.EDIT_SEATING
    );
  } catch {
    return NextResponse.json({ error: "You do not have permission to edit seating" }, { status: 403 });
  }

  try {
    const body = postSchema.parse(await req.json());
    const actorId = session.user.id;

    switch (body.action) {
      case "assign": {
        const plan = await resolvePlan(eventId, body.planType);
        const layout = normalizeStudioLayout(plan.layout as object);
        const guests = await loadStudioGuests(eventId);
        const tables =
          Array.isArray(body.tables) && body.tables.length > 0
            ? normalizeStudioLayout({ tables: body.tables }).tables
            : layout.tables;
        const result = await seatingPartyService.assignPartyToTable({
          eventId,
          seatingPlanId: plan.id,
          guestId: body.guestId,
          tableNumber: body.tableNumber,
          zone: body.zone,
          mode: body.mode,
          tableOnly: body.tableOnly,
          seatLabels: body.seatLabels,
          confirmPartial: body.confirmPartial,
          actorId,
          guests,
          tables,
        });
        return NextResponse.json({ success: true, data: result });
      }
      case "move": {
        const plan = await resolvePlan(eventId, body.planType);
        const result = await seatingPartyService.moveParty({
          eventId,
          seatingPlanId: plan.id,
          invitationId: body.invitationId,
          toTableNumber: body.toTableNumber,
          zone: body.zone,
          actorId,
        });
        return NextResponse.json({ success: true, data: result });
      }
      case "confirm_split": {
        const plan = await resolvePlan(eventId, body.planType);
        const result = await seatingPartyService.confirmSplit({
          eventId,
          seatingPlanId: plan.id,
          invitationId: body.invitationId,
          requiredPlaces: body.requiredPlaces,
          reason: body.reason ?? null,
          actorId,
        });
        return NextResponse.json({ success: true, data: result });
      }
      case "convert_hold": {
        const result = await seatingPartyService.convertCompanionHold({
          eventId,
          holdId: body.holdId,
          guestId: body.guestId,
          actorId,
        });
        return NextResponse.json({ success: true, data: result });
      }
      case "release_holds": {
        const plan = await resolvePlan(eventId, body.planType);
        const result = await seatingPartyService.releaseHoldsForInvitation({
          seatingPlanId: plan.id,
          invitationId: body.invitationId,
          actorId,
        });
        return NextResponse.json({ success: true, data: result });
      }
      case "release_hold": {
        const result = await seatingPartyService.releaseHoldById({
          eventId,
          holdId: body.holdId,
          actorId,
        });
        return NextResponse.json({ success: true, data: result });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return handlePartyError(error);
  }
}
