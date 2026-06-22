import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
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
  const memories = await eventMemoryUploadService.listApprovedPublic(event.id, page, limit);

  return NextResponse.json({
    success: true,
    data: {
      event: { title: event.title, hostName: event.hostName },
      allowDownloads: settings.allowDownloads,
      memories,
    },
  });
}
