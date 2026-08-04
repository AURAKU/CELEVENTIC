import { NextResponse } from "next/server";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";

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

  // Memory tokens are event-scoped, not invitation-scoped. Never pick an
  // arbitrary sibling invitation's uniqueLink — that leaked Party A into
  // Party B's upload surface (and vice versa).
  return NextResponse.json({
    success: true,
    data: {
      event: record.event,
      invitationLink: null,
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
