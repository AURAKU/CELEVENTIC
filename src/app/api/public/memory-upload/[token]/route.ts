import { NextResponse } from "next/server";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";
import { eventMemoryThemeService } from "@/services/memory/event-memory-theme.service";
import { eventMemorySocialService } from "@/services/memory/event-memory-social.service";
import { eventMemoryUploadService } from "@/services/memory/event-memory-upload.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "UPLOAD") {
    return NextResponse.json({ error: "Invalid or expired upload link" }, { status: 404 });
  }

  const settings = await eventMemorySettingsService.getOrCreate(record.eventId);
  const windowOpen = eventMemorySettingsService.isUploadWindowOpen(settings);
  const { publicTheme } = await eventMemoryThemeService.resolveForEvent(record.eventId);

  const url = new URL(req.url);
  const rawGuestKey = url.searchParams.get("guestKey") ?? req.headers.get("x-memory-guest-key");
  const guestKeyHash = eventMemorySocialService.resolveGuestKeyHash(rawGuestKey);
  const hasConsent = guestKeyHash
    ? await eventMemorySocialService.hasConsent(record.eventId, guestKeyHash)
    : false;

  const viewToken = await eventMemoryTokenService.getOrCreateViewToken(record.eventId);
  const analytics = await eventMemoryUploadService.getAnalytics(record.eventId);

  return NextResponse.json({
    success: true,
    data: {
      event: record.event,
      invitationLink: null,
      viewToken: viewToken.token,
      theme: publicTheme,
      hasConsent,
      settings: {
        maxPhotosPerGuest: settings.maxPhotosPerGuest,
        maxVideosPerGuest: settings.maxVideosPerGuest,
        maxImageSizeMb: settings.maxImageSizeMb,
        maxVideoSizeMb: settings.maxVideoSizeMb,
        allowAnonymousUploads: settings.allowAnonymousUploads,
        approvalRequired: settings.approvalRequired,
        isEnabled: settings.isEnabled,
        windowOpen,
      },
      counts: {
        approved: analytics.approved,
        pending: analytics.pending,
      },
    },
  });
}
