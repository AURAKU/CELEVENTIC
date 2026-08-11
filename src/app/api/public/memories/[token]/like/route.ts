import { NextResponse } from "next/server";
import { z } from "zod";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { eventMemorySocialService } from "@/services/memory/event-memory-social.service";

const bodySchema = z.object({
  memoryId: z.string().min(1),
  guestKey: z.string().min(8).max(200),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "VIEW") {
    return NextResponse.json({ error: "Invalid or expired gallery link" }, { status: 404 });
  }

  const settings = await eventMemorySettingsService.getOrCreate(record.eventId);
  if (!settings.isEnabled) {
    return NextResponse.json({ error: "Memory gallery is not available" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "memoryId and guestKey required" }, { status: 400 });
  }

  const guestKeyHash = eventMemorySocialService.resolveGuestKeyHash(parsed.data.guestKey);
  if (!guestKeyHash) {
    return NextResponse.json({ error: "Invalid guest key" }, { status: 400 });
  }

  try {
    const result = await eventMemorySocialService.toggleLike({
      eventId: record.eventId,
      memoryId: parsed.data.memoryId,
      guestKeyHash,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update like" },
      { status: 400 }
    );
  }
}
