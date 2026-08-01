import { NextResponse } from "next/server";
import { requireQrHubAccess } from "@/lib/qr-hub/qr-hub-guard";
import { eventQrPackService } from "@/services/qr-hub/event-qr-pack.service";
import type { QrHubAssetKind } from "@/lib/qr-hub/types";

export const dynamic = "force-dynamic";

/** Download Event Ground QR Pack (ZIP PNG/SVG or combined PDF). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const guard = await requireQrHubAccess(eventId, { downloadOnly: true });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const kinds = (Array.isArray(body?.kinds) ? body!.kinds : []) as QrHubAssetKind[];
  if (!kinds.length) {
    return NextResponse.json({ error: "Select at least one QR asset" }, { status: 400 });
  }

  const format = body?.format === "svg" || body?.format === "pdf" ? body.format : "png";

  try {
    if (format === "pdf") {
      const pack = await eventQrPackService.buildPdf({
        eventId: guard.eventId,
        actorId: guard.userId,
        kinds,
        perPage: ([1, 2, 4, 6].includes(Number(body?.perPage))
          ? Number(body?.perPage)
          : 2) as 1 | 2 | 4 | 6,
      });
      return new NextResponse(new Uint8Array(pack.buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pack.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pack = await eventQrPackService.buildZip({
      eventId: guard.eventId,
      actorId: guard.userId,
      kinds,
      format,
      size: ([512, 1024, 2048].includes(Number(body?.size))
        ? Number(body?.size)
        : 1024) as 512 | 1024 | 2048,
    });
    return new NextResponse(new Uint8Array(pack.buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pack.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[qr-hub.pack]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build QR pack" },
      { status: 500 }
    );
  }
}
