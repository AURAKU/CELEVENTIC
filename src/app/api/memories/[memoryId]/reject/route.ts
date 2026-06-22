import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { z } from "zod";

const schema = z.object({ reason: z.string().optional() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memoryId } = await params;
  try {
    const memory = await eventMemoryUploadService.getById(memoryId);
    if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await verifyEventAccess(memory.eventId, session.user.id, session.user.role);
    const { reason } = schema.parse(await req.json().catch(() => ({})));
    const updated = await eventMemoryUploadService.reject(memoryId, session.user.id, reason);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to reject" }, { status: 403 });
  }
}
