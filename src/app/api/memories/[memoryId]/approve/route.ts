import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memoryId } = await params;
  try {
    const memory = await eventMemoryUploadService.getById(memoryId);
    if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await verifyEventAccess(memory.eventId, session.user.id, session.user.role);
    const updated = await eventMemoryUploadService.approve(memoryId, session.user.id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to approve" }, { status: 403 });
  }
}
