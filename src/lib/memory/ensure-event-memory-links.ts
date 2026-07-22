import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";

export type EventMemoryLinks = {
  eventId: string;
  eventTitle: string;
  uploadToken: string;
  viewToken: string;
  uploadUrl: string;
  albumUrl: string;
  uploadQrImageUrl: string;
  albumQrImageUrl: string;
};

function qrImageUrl(targetUrl: string, eventId: string) {
  return `/api/qr/image?data=${encodeURIComponent(targetUrl)}&eventId=${encodeURIComponent(eventId)}&size=512`;
}

/** Ensure UPLOAD + VIEW tokens and return guest-facing Album / upload links. */
export async function ensureEventMemoryLinks(eventId: string): Promise<EventMemoryLinks | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });
  if (!event) return null;

  // Live guest album: create settings if missing and keep vault enabled.
  const settings = await eventMemorySettingsService.getOrCreate(eventId);
  if (!settings.isEnabled) {
    await eventMemorySettingsService.update(eventId, { isEnabled: true });
  }

  const baseUrl = await getServerAppUrl();
  const [uploadToken, viewToken] = await Promise.all([
    eventMemoryTokenService.getOrCreateUploadToken(eventId),
    eventMemoryTokenService.getOrCreateViewToken(eventId),
  ]);

  const uploadUrl = `${baseUrl}/memory-upload/${uploadToken.token}`;
  const albumUrl = `${baseUrl}/memory/${viewToken.token}`;

  return {
    eventId: event.id,
    eventTitle: event.title,
    uploadToken: uploadToken.token,
    viewToken: viewToken.token,
    uploadUrl,
    albumUrl,
    uploadQrImageUrl: qrImageUrl(uploadUrl, event.id),
    albumQrImageUrl: qrImageUrl(albumUrl, event.id),
  };
}

const DEMO_SLUG = "celeventic-memory-demo";

/**
 * Shared demo event so catalog / template previews can show a working Album QR
 * without tying to a fake "preview-event" id.
 */
export async function ensureDemoMemoryLinks(eventTitle?: string): Promise<EventMemoryLinks | null> {
  let event = await prisma.event.findUnique({ where: { slug: DEMO_SLUG } });

  if (!event) {
    const organizer =
      (await prisma.user.findFirst({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ORGANIZER"] } },
        select: { id: true },
      })) ?? (await prisma.user.findFirst({ select: { id: true } }));

    if (!organizer) return null;

    const start = new Date();
    start.setMonth(start.getMonth() + 1);

    event = await prisma.event.create({
      data: {
        slug: DEMO_SLUG,
        title: eventTitle?.trim() || "Celeventic Live Album",
        eventType: "WEDDING",
        hostName: "Celeventic",
        description: "Demo album for invitation Memory Vault previews.",
        startDate: start,
        isPublic: false,
        status: "PUBLISHED",
        organizerId: organizer.id,
      },
    });
  } else if (eventTitle?.trim() && event.title !== eventTitle.trim()) {
    // Keep demo title aligned with the template being previewed when possible
    event = await prisma.event.update({
      where: { id: event.id },
      data: { title: eventTitle.trim() },
    });
  }

  // Prefer live visibility for the shared demo album
  await eventMemorySettingsService.update(event.id, {
    isEnabled: true,
    approvalRequired: false,
    allowAnonymousUploads: true,
  });

  return ensureEventMemoryLinks(event.id);
}
