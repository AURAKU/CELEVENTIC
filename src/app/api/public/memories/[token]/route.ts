import { NextResponse } from "next/server";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(
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

  const { page, limit } = parsePaginationFromUrl(req.url);
  const url = new URL(req.url);
  const mediaRaw = url.searchParams.get("mediaType");
  const mediaType = mediaRaw === "image" || mediaRaw === "video" ? mediaRaw : undefined;
  const memories = await eventMemoryUploadService.listApprovedPublic(record.eventId, page, limit, mediaType);

  return NextResponse.json({
    success: true,
    data: {
      event: { title: record.event.title, hostName: record.event.hostName },
      allowDownloads: settings.allowDownloads,
      memories,
    },
  });
}
