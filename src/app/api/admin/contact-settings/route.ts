import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAdminService } from "@/services/admin/invitation-admin.service";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await invitationAdminService.getContactSettings();
  return NextResponse.json({ success: true, data });
}

const schema = z.object({
  phone: z.string().min(5),
  email: z.string().email(),
  hours: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = schema.parse(await req.json());
    await invitationAdminService.saveContactSettings(body);
    return NextResponse.json({ success: true, data: body });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 400 });
  }
}
