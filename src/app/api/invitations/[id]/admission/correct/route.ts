import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";
import { correctAdmission, getAdmissionHistory } from "@/services/admission/admission.service";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Organiser corrections on a party's admission.
 *
 * Sibling of the reset endpoint and guarded identically: correcting who is
 * inside is guest management, so scanners and viewers are excluded. Every
 * correction appends to the ledger, nothing here deletes history.
 */

const correctSchema = z
  .object({
    action: z.enum(["undo_last", "correct_quantity", "readmit", "move_seat", "restore_seat"]),
    quantity: z.number().int().min(0).max(500).optional(),
    guestId: z.string().min(1).optional(),
    tableNumber: z.string().trim().min(1).max(40).optional(),
    seatLabel: z.string().trim().max(40).optional(),
    reason: z.string().trim().min(3, "A reason is required"),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.action !== "correct_quantity" || typeof v.quantity === "number", {
    message: "A corrected quantity is required",
    path: ["quantity"],
  })
  .refine(
    (v) => (v.action !== "move_seat" && v.action !== "restore_seat") || Boolean(v.tableNumber),
    { message: "A destination table is required", path: ["tableNumber"] }
  );

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function authorize(invitationId: string, userId: string, role: UserRole) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { id: true, eventId: true },
  });
  if (!invitation) return { error: "Invitation not found", status: 404 as const };
  try {
    await requireEventPermission(
      invitation.eventId,
      userId,
      role,
      EventPermissionKey.MANAGE_GUESTS
    );
  } catch {
    return {
      error: "You do not have permission to correct admission",
      status: 403 as const,
    };
  }
  return { invitation };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`admission-correct:${session.user.id}:${clientIp(req)}`, 40, 60);
  if (!rl.success) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  try {
    const { id: invitationId } = await params;
    const auth = await authorize(
      invitationId,
      session.user.id,
      session.user.role as UserRole
    );
    if ("error" in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const data = correctSchema.parse(await req.json());
    const summary = await correctAdmission({
      invitationId,
      action: data.action,
      actorUserId: session.user.id,
      reason: data.reason,
      notes: data.notes,
      quantity: data.quantity,
      guestId: data.guestId,
      tableNumber: data.tableNumber,
      seatLabel: data.seatLabel,
    });

    return NextResponse.json({
      success: true,
      data: { ...summary, portalLocked: !summary.canAccessPortal },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Correction failed";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

/** The append-only admission ledger for this invitation. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id: invitationId } = await params;
  const auth = await authorize(invitationId, session.user.id, session.user.role as UserRole);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({ success: true, data: await getAdmissionHistory(invitationId) });
}
