import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { canRemoveEventMemoryMedia } from "@/services/memory/event-memory-social.service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memoryId } = await params;
  try {
    const memory = await eventMemoryUploadService.getById(memoryId);
    if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const allowed = await canRemoveEventMemoryMedia(
      memory.eventId,
      session.user.id,
      session.user.role
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Only an admin or the organizer can remove photos and videos" },
        { status: 403 }
      );
    }
    await eventMemoryUploadService.delete(memoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete" }, { status: 403 });
  }
}
