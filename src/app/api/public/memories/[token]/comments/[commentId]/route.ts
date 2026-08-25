import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import {
  eventMemorySocialService,
  isMemoryEventModerator,
} from "@/services/memory/event-memory-social.service";

const bodySchema = z.object({
  authorToken: z.string().min(10).optional(),
});

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ token: string; commentId: string }> }
) {
  const { token, commentId } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "VIEW") {
    return NextResponse.json({ error: "Invalid or expired gallery link" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const isModerator = await isMemoryEventModerator(
    record.eventId,
    session?.user?.id,
    session?.user?.role
  );

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  const authorToken = parsed.success ? parsed.data.authorToken : undefined;

  try {
    await eventMemorySocialService.deleteComment({
      commentId,
      eventId: record.eventId,
      authorToken,
      isModerator,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete comment" },
      { status: 403 }
    );
  }
}
