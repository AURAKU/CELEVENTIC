import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import {
  eventMemorySocialService,
  canRemoveEventMemoryMedia,
} from "@/services/memory/event-memory-social.service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string; memoryId: string }> }
) {
  const { token, memoryId } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "VIEW") {
    return NextResponse.json({ error: "Invalid or expired gallery link" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const canRemoveMedia = await canRemoveEventMemoryMedia(
    record.eventId,
    session?.user?.id,
    session?.user?.role
  );

  try {
    await eventMemorySocialService.deleteMemory({
      memoryId,
      eventId: record.eventId,
      isModerator: canRemoveMedia,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete memory" },
      { status: 403 }
    );
  }
}
