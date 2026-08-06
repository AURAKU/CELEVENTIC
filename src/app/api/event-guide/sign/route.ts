import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireQrHubAccess } from "@/lib/qr-hub/qr-hub-guard";
import { eventGuideService } from "@/services/event-guide/event-guide.service";
import { guideSignService } from "@/services/event-guide/guide-sign.service";
import { SIGN_SIZES, SIGN_TEMPLATES, type SignSizeKey, type SignTemplateKey } from "@/lib/event-guide/signage";

export const dynamic = "force-dynamic";

/**
 * Printable welcome-board sign.
 *
 * Always renders the *published* theme and header so a printed board can never
 * disagree with what a guest sees after scanning it.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;

  const guard = await requireQrHubAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!guard.canDownload) {
    return NextResponse.json({ error: "You do not have permission to download signs" }, { status: 403 });
  }

  const link = await eventGuideService.ensureLink(guard.eventId, guard.userId);
  const resolved = await eventGuideService.resolvePublic(link.publicToken);
  if (!resolved.available) {
    return NextResponse.json(
      { error: "Publish the guide before printing a sign, so the board matches what guests will see." },
      { status: 400 }
    );
  }

  const [event, guide, offlineLink] = await Promise.all([
    eventGuideService.getEvent(guard.eventId),
    prisma.eventGuide.findUnique({
      where: { eventId: guard.eventId },
      select: { venueWifiName: true, venueOfflineEnabled: true },
    }),
    prisma.eventQrLink.findFirst({
      where: { eventId: guard.eventId, type: "EVENT_GUIDE_OFFLINE", status: "ACTIVE" },
      select: { destinationUrl: true },
    }),
  ]);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const size = (body?.size as SignSizeKey) in SIGN_SIZES ? (body!.size as SignSizeKey) : "a4";
  const template =
    (body?.template as SignTemplateKey) in SIGN_TEMPLATES
      ? (body!.template as SignTemplateKey)
      : "classic";
  const format = body?.format === "png" ? "png" : "pdf";

  // A dual sign is only offered when there is genuinely a second destination —
  // printing an empty "Backup" placeholder would be worse than one clean code.
  const offlineUrl =
    guide?.venueOfflineEnabled && offlineLink?.destinationUrl ? offlineLink.destinationUrl : null;
  const layout = body?.layout === "dual" && offlineUrl ? "dual" : "single";

  const request = {
    eventId: guard.eventId,
    actorId: guard.userId,
    eventTitle: resolved.payload.header.eventTitle,
    celebrants: resolved.payload.header.celebrants,
    dateLabel: resolved.payload.header.dateLabel,
    venue: resolved.payload.header.venue,
    theme: resolved.payload.theme,
    template,
    size,
    layout: layout as "single" | "dual",
    onlineUrl: await eventGuideService.guideUrl(link.publicToken),
    offlineUrl,
    wifiName: guide?.venueWifiName ?? null,
  };

  const result =
    format === "png"
      ? await guideSignService.buildPng(request)
      : await guideSignService.buildPdf(request);

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": format === "png" ? "image/png" : "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
