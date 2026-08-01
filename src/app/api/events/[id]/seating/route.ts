import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seatingService } from "@/services/seating/seating.service";
import { seatingPartyService } from "@/services/seating/seating-party.service";
import type { SeatingLayout } from "@/services/seating/seating.service";
import { requireEventPermission, verifyEventAccess } from "@/lib/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import type { UserRole } from "@prisma/client";
import { z } from "zod";
import { SEATING_GUEST_BATCH, SEATING_GUEST_LIMIT } from "@/lib/pagination";

const LIVE_PASS_STATUSES = [
  "ACTIVE",
  "PARTIALLY_ADMITTED",
  "ADMITTED",
  "PENDING_SYNC",
  "CONFLICT",
  "MANUAL_REVIEW",
] as ("ACTIVE" | "PARTIALLY_ADMITTED" | "ADMITTED" | "PENDING_SYNC" | "CONFLICT" | "MANUAL_REVIEW")[];

const seatingGuestSelect = {
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
        where: {
          status: {
            in: LIVE_PASS_STATUSES,
          },
        },
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
};

/** Load every active guest for the event — organizers must not lose roster rows to a silent cap. */
async function loadAllSeatingGuests(eventId: string) {
  type SeatingGuest = Awaited<
    ReturnType<typeof prisma.guest.findMany<{ select: typeof seatingGuestSelect }>>
  >[number];
  const guests: SeatingGuest[] = [];
  let cursor: string | undefined;
  while (guests.length < SEATING_GUEST_LIMIT) {
    const batch = await prisma.guest.findMany({
      where: { eventId, archivedAt: null },
      select: seatingGuestSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: Math.min(SEATING_GUEST_BATCH, SEATING_GUEST_LIMIT - guests.length),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    guests.push(...batch);
    cursor = batch[batch.length - 1]?.id;
    if (batch.length < SEATING_GUEST_BATCH) break;
  }
  return guests;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const plans = await seatingService.getPlansForEvent(eventId);
    const plan = plans.find((row) => row.planType === "RECEPTION") ?? plans[0] ?? null;

    const holdsByPlanId: Record<
      string,
      {
        companionHolds: Awaited<ReturnType<typeof seatingPartyService.listActiveHolds>>;
        partyPlans: Awaited<ReturnType<typeof seatingPartyService.listPartyPlans>>;
      }
    > = {};
    await Promise.all(
      plans.map(async (row) => {
        const [companionHolds, partyPlans] = await Promise.all([
          seatingPartyService.listActiveHolds(row.id),
          seatingPartyService.listPartyPlans(row.id),
        ]);
        holdsByPlanId[row.id] = { companionHolds, partyPlans };
      })
    );
    const primaryHolds = plan ? holdsByPlanId[plan.id] : { companionHolds: [], partyPlans: [] };

    const [guests, guestTotal] = await Promise.all([
      loadAllSeatingGuests(eventId),
      prisma.guest.count({ where: { eventId, archivedAt: null } }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        plan,
        plans,
        guests: guests.map((guest) => {
          const pass = guest.invitation?.guestPasses[0];
          const allowance = guest.invitation
            ? Math.max(
                1,
                guest.invitation.admissionAllowance ??
                  pass?.partySize ??
                  1 + Math.max(0, guest.plusOnes)
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
            qrToken: guest.qrToken,
            status: guest.status,
            plusOnes: guest.plusOnes,
            invitationId: guest.invitationId,
            partySize: allowance,
            admission: guest.invitation
              ? {
                  allowance,
                  admittedCount,
                  remainingCount: Math.max(0, allowance - admittedCount),
                  state: admissionState,
                }
              : null,
            tags: guest.tagAssignments.map((row) => ({
              id: row.tag.id,
              label: row.tag.label,
            })),
          };
        }),
        guestTotal,
        guestsTruncated: guestTotal > guests.length,
        companionHolds: primaryHolds.companionHolds,
        partyPlans: primaryHolds.partyPlans,
        holdsByPlanId,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

const upsertSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    planType: z.enum(["RECEPTION", "CEREMONY"]).optional().default("RECEPTION"),
    /** Client layout.revision when saving — reject if server is newer. */
    expectedRevision: z.number().int().min(0).optional(),
    layout: z
      .object({
        tables: z
          .array(
            z.object({
              id: z.string().min(1).max(120),
              label: z.string().trim().min(1).max(80),
              zone: z.string().trim().max(80).optional(),
              zoneId: z.string().max(120).optional(),
              kind: z.string().max(40).optional(),
              capacity: z.number().optional(),
              shape: z.enum(["round", "square", "rectangle"]).optional(),
              seatCount: z.number().min(2).max(20).optional(),
              x: z.number().optional(),
              y: z.number().optional(),
              rotation: z.number().optional(),
              locked: z.boolean().optional(),
              vip: z.boolean().optional(),
              category: z.string().max(80).optional(),
              color: z.string().max(40).optional(),
              notes: z.string().max(500).optional(),
              seatsAtEnds: z.boolean().optional(),
              numberingClockwise: z.boolean().optional(),
            })
          )
          .default([]),
        ceremonyRows: z.array(z.any()).optional(),
        ceremonySections: z.array(z.any()).optional(),
        zones: z
          .array(
            z.object({
              id: z.string().min(1).max(120),
              name: z.string().trim().min(1).max(80),
              color: z.string().max(40),
              description: z.string().max(240).optional(),
              capacity: z.number().optional(),
              priority: z.number().optional(),
            })
          )
          .optional(),
        elements: z
          .array(
            z.object({
              id: z.string().min(1).max(120),
              kind: z.string().min(1).max(40),
              label: z.string().max(80),
              x: z.number(),
              y: z.number(),
              width: z.number().optional(),
              height: z.number().optional(),
              rotation: z.number().optional(),
              locked: z.boolean().optional(),
              notes: z.string().max(500).optional(),
            })
          )
          .optional(),
        notes: z.string().optional(),
        expectedGuests: z.number().optional(),
        status: z.enum(["draft", "published"]).optional(),
        publishedAt: z.string().nullable().optional(),
        revision: z.number().optional(),
        settings: z.record(z.any()).optional(),
        planKind: z.enum(["RECEPTION", "CEREMONY"]).optional(),
      })
      .passthrough(),
  })
  .superRefine((value, ctx) => {
    if (value.planType === "CEREMONY") return;
    const seen = new Set<string>();
    value.layout.tables.forEach((table, index) => {
      const key = table.label.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["layout", "tables", index, "label"],
          message: `Duplicate table name: ${table.label}`,
        });
      }
      seen.add(key);
    });
  });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const body = upsertSchema.parse(await req.json());
    const existing = await seatingService.getPlanByType(eventId, body.planType);
    if (existing && body.expectedRevision != null) {
      const serverRevision =
        typeof (existing.layout as { revision?: number } | null)?.revision === "number"
          ? (existing.layout as { revision: number }).revision
          : 0;
      if (body.expectedRevision < serverRevision) {
        return NextResponse.json(
          {
            error:
              "This seating plan was updated by another organiser. Review the latest version before saving.",
            code: "STALE_REVISION",
            details: { serverRevision, expectedRevision: body.expectedRevision },
          },
          { status: 409 }
        );
      }
    }
    const plan = await seatingService.upsertPlan(
      eventId,
      body.name,
      body.layout as SeatingLayout,
      body.planType
    );
    return NextResponse.json({ success: true, data: plan });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
