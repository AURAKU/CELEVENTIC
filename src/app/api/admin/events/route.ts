import { NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services/admin/admin.service";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const data = await adminService.getEvents(page, limit, search, status);
  return NextResponse.json({
    success: true,
    data: {
      ...data,
      events: data.events.map((e) => ({
        ...e,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    },
  });
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  hostName: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  isPublic: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, ...rest } = updateSchema.parse(await req.json());
    const event = await adminService.updateEvent(id, rest);
    await createAuditLog({ userId: session.user.id, action: "UPDATE", entity: "event", entityId: id, details: rest });
    return NextResponse.json({ success: true, data: event });
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

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const result = await adminService.deleteEvent(id);
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      entity: "event",
      entityId: id,
      details: { mode: result.mode },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 });
  }
}
