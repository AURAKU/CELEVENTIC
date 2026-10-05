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

export const DEMO_MEMORY_EVENT_SLUG = "celeventic-memory-demo";
const DEMO_SLUG = DEMO_MEMORY_EVENT_SLUG;

/**
 * Shared demo event so catalog / template previews can show a working Album QR
 * without tying to a fake "preview-event" id.
 */
export async function ensureDemoMemoryLinks(eventTitle?: string): Promise<EventMemoryLinks | null> {
  let event = await prisma.event.findUnique({ where: { slug: DEMO_SLUG } });

  const displayTitle = eventTitle?.trim() || null;

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
        title: "Celeventic Live Album",
        eventType: "WEDDING",
        hostName: "Celeventic",
        description: "Demo album for invitation Memory Vault previews.",
        startDate: start,
        isPublic: false,
        status: "PUBLISHED",
        organizerId: organizer.id,
      },
    });
  } else if (event.title !== "Celeventic Live Album") {
    // Preview pages used to rename this shared row to the couple on screen,
    // which made Kojo & Fafa / Enock & Ruth look like real events with no invitation.
    event = await prisma.event.update({
      where: { id: event.id },
      data: { title: "Celeventic Live Album", hostName: "Celeventic" },
    });
  }

  // Prefer live visibility for the shared demo album
  await eventMemorySettingsService.update(event.id, {
    isEnabled: true,
    approvalRequired: false,
    allowAnonymousUploads: true,
  });

  const links = await ensureEventMemoryLinks(event.id);
  if (!links) return null;
  return displayTitle ? { ...links, eventTitle: displayTitle } : links;
}
