import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import type { EventMemoryUploadStatus } from "@prisma/client";
import { z } from "zod";

const bulkSchema = z
  .object({
    ids: z.array(z.string()).min(1).optional(),
    approveAllPending: z.boolean().optional(),
  })
  .refine((v) => v.approveAllPending || (v.ids?.length ?? 0) > 0, {
    message: "Provide ids or approveAllPending",
  });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as EventMemoryUploadStatus | null;
    const { page, limit } = parsePaginationFromUrl(req.url);
    const [memories, analytics] = await Promise.all([
      eventMemoryUploadService.listForEvent(eventId, {
        status: status ?? undefined,
        page,
        limit,
      }),
      eventMemoryUploadService.getAnalytics(eventId),
    ]);
    return NextResponse.json({ success: true, data: { ...memories, analytics } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const body = bulkSchema.parse(await req.json());
    const result = body.approveAllPending
      ? await eventMemoryUploadService.approveAllPending(eventId, session.user.id)
      : await eventMemoryUploadService.bulkApprove(body.ids ?? [], session.user.id);
    return NextResponse.json({ success: true, data: { count: result.count } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
