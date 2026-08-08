import { NextResponse } from "next/server";
import { requireQrHubAccess } from "@/lib/qr-hub/qr-hub-guard";
import { eventGuideOfflinePackService } from "@/services/event-guide/offline-pack.service";
import { GuideError } from "@/services/event-guide/event-guide.service";

export const dynamic = "force-dynamic";

/**
 * Download a signed Venue Offline Pack.
 *
 * Authenticated and permission-gated — this is never a public URL. The pack is
 * the credential for the local guide, so the raw token is returned once, in a
 * response header, alongside the file that embeds it.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");

  const guard = await requireQrHubAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!guard.canDownload) {
    return NextResponse.json(
      { error: "You do not have permission to download offline packs" },
      { status: 403 }
    );
  }

  try {
    const pack = await eventGuideOfflinePackService.build({
      eventId: guard.eventId,
      actorId: guard.userId,
    });

    return new NextResponse(new Uint8Array(pack.buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pack.filename}"`,
        "Cache-Control": "no-store",
        "X-Guide-Pack-Expires": pack.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof GuideError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build the offline pack" },
      { status: 400 }
    );
  }
}
