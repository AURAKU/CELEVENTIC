import { NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await adminService.getSettings();
  return NextResponse.json({ success: true, data: settings });
}

const patchSchema = z.object({
  key: z.string(),
  value: z.record(z.unknown()),
});

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = patchSchema.parse(await req.json());
    const setting = await adminService.updateSetting(data.key, data.value);
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "admin_setting",
      entityId: data.key,
      details: data.value,
    });
    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  await adminService.deleteSetting(key);
  await createAuditLog({ userId: session.user.id, action: "DELETE", entity: "admin_setting", entityId: key });
  return NextResponse.json({ success: true });
}
