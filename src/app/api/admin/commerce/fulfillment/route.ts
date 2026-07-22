import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { parsePaginationFromUrl, paginatedResult } from "@/lib/pagination";

/** Admin lifecycle management for bespoke extra requests (paginated). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { page, limit, skip } = parsePaginationFromUrl(req.url, { limit: 20 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const where = status ? { status } : {};

  const [items, total] = await Promise.all([
    prisma.addonFulfillmentRequest.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        order: {
          select: { id: true, eventTitle: true, templateSlug: true, user: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.addonFulfillmentRequest.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: paginatedResult(items, total, page, limit) });
}

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING_INFO", "SUBMITTED", "IN_PROGRESS", "DELIVERED"]).optional(),
  deliverableUrl: z.string().url().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await req.json());
    const { id, ...data } = body;
    const request = await prisma.addonFulfillmentRequest.update({ where: { id }, data });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "AddonFulfillmentRequest",
      entityId: id,
      details: { operation: "ADDON_FULFILLMENT_UPDATE", ...body },
    });

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
