import { NextResponse } from "next/server";
import { z } from "zod";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { eventMemorySocialService } from "@/services/memory/event-memory-social.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

const createSchema = z.object({
  memoryId: z.string().min(1),
  authorName: z.string().min(1).max(80),
  message: z.string().min(1).max(500),
  guestKey: z.string().min(8).max(200).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "VIEW") {
    return NextResponse.json({ error: "Invalid or expired gallery link" }, { status: 404 });
  }

  const url = new URL(req.url);
  const memoryId = url.searchParams.get("memoryId");
  if (!memoryId) return NextResponse.json({ error: "memoryId required" }, { status: 400 });

  const { page, limit } = parsePaginationFromUrl(req.url);
  const comments = await eventMemorySocialService.listComments(memoryId, record.eventId, page, Math.min(limit, 50));
  return NextResponse.json({ success: true, data: comments });
}

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

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  try {
    const guestKeyHash = eventMemorySocialService.resolveGuestKeyHash(parsed.data.guestKey);
    const comment = await eventMemorySocialService.addComment({
      eventId: record.eventId,
      memoryId: parsed.data.memoryId,
      authorName: parsed.data.authorName,
      message: parsed.data.message,
      guestKeyHash,
    });
    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add comment" },
      { status: 400 }
    );
  }
}
