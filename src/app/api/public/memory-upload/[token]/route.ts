import { NextResponse } from "next/server";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "UPLOAD") {
    return NextResponse.json({ error: "Invalid or expired upload link" }, { status: 404 });
  }

  const settings = await eventMemorySettingsService.getOrCreate(record.eventId);
  const windowOpen = eventMemorySettingsService.isUploadWindowOpen(settings);

  const invitation = await prisma.invitation.findFirst({
    where: { eventId: record.eventId },
    select: { uniqueLink: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      event: record.event,
      invitationLink: invitation?.uniqueLink ?? null,
      settings: {
        maxPhotosPerGuest: settings.maxPhotosPerGuest,
        maxVideosPerGuest: settings.maxVideosPerGuest,
        maxImageSizeMb: settings.maxImageSizeMb,
        maxVideoSizeMb: settings.maxVideoSizeMb,
        allowAnonymousUploads: settings.allowAnonymousUploads,
        isEnabled: settings.isEnabled,
        windowOpen,
      },
    },
  });
}
