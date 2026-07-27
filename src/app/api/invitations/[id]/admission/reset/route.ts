import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";
import { resetAdmission } from "@/services/admission/admission.service";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const resetSchema = z.object({
  scope: z.enum(["individual", "selected", "entire"]),
  guestIds: z.array(z.string().min(1)).optional(),
  reason: z.string().trim().min(3, "A reason is required"),
  notes: z.string().trim().max(1000).optional(),
  options: z
    .object({
      releaseSeating: z.boolean().optional(),
      regenerateQr: z.boolean().optional(),
    })
    .optional(),
});

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`admission-reset:${session.user.id}:${clientIp(req)}`, 40, 60);
  if (!rl.success) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  try {
    const { id: invitationId } = await params;
    const body = await req.json();
    const data = resetSchema.parse(body);

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { id: true, eventId: true },
    });
    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
    }

    // RBAC — reset is a guest-management action. Scanners/ushers (SCAN_QR only)
    // and viewers are excluded; owner/organiser/guest-manager/admin pass.
    try {
      await requireEventPermission(
        invitation.eventId,
        session.user.id,
        session.user.role as UserRole,
        EventPermissionKey.MANAGE_GUESTS
      );
    } catch {
      return NextResponse.json(
        { success: false, error: "You do not have permission to reset admission" },
        { status: 403 }
      );
    }

    const result = await resetAdmission({
      invitationId,
      scope: data.scope,
      guestIds: data.guestIds,
      actorUserId: session.user.id,
      actorRole: session.user.role,
      reason: data.reason,
      notes: data.notes,
      options: data.options,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result.summary,
        resetGuestIds: result.resetGuestIds,
        portalLocked: !result.summary.canAccessPortal,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Reset failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
