import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { eventMemoryThemeService } from "@/services/memory/event-memory-theme.service";
import {
  eventMemorySocialService,
  isMemoryEventModerator,
} from "@/services/memory/event-memory-social.service";
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
  const rawGuestKey = url.searchParams.get("guestKey") ?? req.headers.get("x-memory-guest-key");
  const guestKeyHash = eventMemorySocialService.resolveGuestKeyHash(rawGuestKey);

  const session = await getServerSession(authOptions);
  const canModerate = await isMemoryEventModerator(
    record.eventId,
    session?.user?.id,
    session?.user?.role
  );

  const memories = await eventMemoryUploadService.listApprovedPublic(record.eventId, page, limit, mediaType);
  const enriched = await eventMemorySocialService.enrichApprovedItems(memories.items, guestKeyHash, {
    canModerate,
  });
  const { publicTheme } = await eventMemoryThemeService.resolveForEvent(record.eventId);

  return NextResponse.json({
    success: true,
    data: {
      event: {
        id: record.eventId,
        title: record.event.title,
        hostName: record.event.hostName,
        coverImageUrl: record.event.coverImageUrl,
        logoUrl: record.event.logoUrl,
      },
      allowDownloads: settings.allowDownloads,
      theme: publicTheme,
      canModerate,
      viewToken: token,
      memories: { ...memories, items: enriched },
    },
  });
}
