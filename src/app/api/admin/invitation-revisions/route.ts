import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const orderId = new URL(req.url).searchParams.get("orderId") ?? undefined;
  const revisions = await invitationAdminService.listRevisions(orderId);
  return NextResponse.json({ success: true, data: revisions });
}

const createSchema = z.object({
  invitationOrderId: z.string(),
  notes: z.string().optional(),
  isExtraPaid: z.boolean().optional(),
  amountGhs: z.number().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["REQUESTED", "IN_PROGRESS", "AWAITING_APPROVAL", "COMPLETED", "CANCELLED"]).optional(),
  adminNotes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = createSchema.parse(await req.json());
    const revision = await invitationAdminService.createRevision(body);
    return NextResponse.json({ success: true, data: revision }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Create failed" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = patchSchema.parse(await req.json());
    const { id, ...data } = body;
    const revision = await invitationAdminService.updateRevision(id, data);
    return NextResponse.json({ success: true, data: revision });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
