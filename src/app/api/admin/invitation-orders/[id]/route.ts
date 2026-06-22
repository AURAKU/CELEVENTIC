import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";

const schema = z.object({
  status: z.string().optional(),
  productionStatus: z.string().optional(),
  assignedDesignerId: z.string().nullable().optional(),
  adminNotes: z.string().optional(),
  missingInfoRequest: z.string().optional(),
  revisionsUsed: z.number().optional(),
  archive: z.boolean().optional(),
  markDelivered: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = schema.parse(await req.json());
    if (body.markDelivered) {
      const order = await invitationAdminService.markDelivered(id, session.user.id);
      return NextResponse.json({ success: true, data: order });
    }
    const order = await invitationAdminService.updateOrder(id, session.user.id, body);
    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
