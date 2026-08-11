import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { eventMemoryThemeService } from "@/services/memory/event-memory-theme.service";
import {
  eventMemorySocialService,
  isMemoryEventModerator,
} from "@/services/memory/event-memory-social.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const settings = await eventMemorySettingsService.getOrCreate(event.id);
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
  const canModerate = await isMemoryEventModerator(event.id, session?.user?.id, session?.user?.role);

  const memories = await eventMemoryUploadService.listApprovedPublic(event.id, page, limit, mediaType);
  const enriched = await eventMemorySocialService.enrichApprovedItems(memories.items, guestKeyHash, {
    canModerate,
  });
  const { publicTheme } = await eventMemoryThemeService.resolveForEvent(event.id);
  const viewToken = await eventMemoryTokenService.getOrCreateViewToken(event.id);

  return NextResponse.json({
    success: true,
    data: {
      event: {
        id: event.id,
        title: event.title,
        hostName: event.hostName,
        coverImageUrl: event.coverImageUrl,
        logoUrl: event.logoUrl,
      },
      allowDownloads: settings.allowDownloads,
      theme: publicTheme,
      canModerate,
      viewToken: viewToken.token,
      memories: { ...memories, items: enriched },
    },
  });
}
