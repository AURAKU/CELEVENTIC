import { NextResponse } from "next/server";
import sharp from "sharp";
import { seatingService } from "@/services/seating/seating.service";
import {
  buildVenueMapSvg,
  venueMapFilename,
} from "@/lib/seating/venue-map-export";
import {
  DEFAULT_STUDIO_SETTINGS,
  type SeatingPlanKind,
  type StudioLayout,
  type StudioSettings,
  type StudioTableConfig,
} from "@/lib/seating/studio-types";
import type { CeremonyRow } from "@/lib/seating/ceremony-engine";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await seatingService.lookupByGuestToken(token);
  if (!result) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const settings = {
    ...DEFAULT_STUDIO_SETTINGS,
    ...(result.settings as Partial<StudioSettings> | undefined),
  };
  if (!settings.showMapToGuests) {
    return NextResponse.json(
      { error: "The host has not enabled the guest venue map yet." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const requested =
    (url.searchParams.get("plan") as SeatingPlanKind | null) ??
    (result.ceremonyAssignment ? "CEREMONY" : "RECEPTION");

  const ceremonyLayout = (result.ceremonyLayout ?? null) as StudioLayout | null;
  const receptionLayout = (result.layout ?? null) as StudioLayout | null;

  const planType: SeatingPlanKind =
    requested === "CEREMONY" && ceremonyLayout?.status !== "draft"
      ? "CEREMONY"
      : receptionLayout?.status !== "draft"
        ? "RECEPTION"
        : requested;

  const activeLayout =
    planType === "CEREMONY" ? ceremonyLayout : receptionLayout;

  if (!activeLayout || activeLayout.status === "draft") {
    return NextResponse.json(
      { error: "Venue map is not published yet." },
      { status: 404 }
    );
  }

  const directions =
    planType === "CEREMONY"
      ? settings.ceremonyDirections ?? settings.directionsFromEntrance ?? []
      : settings.receptionDirections ?? settings.directionsFromEntrance ?? [];

  const planName =
    planType === "CEREMONY"
      ? result.ceremonyAssignment?.planName ?? "Ceremony map"
      : result.assignment?.planName ?? "Reception map";

  const { svg } = buildVenueMapSvg({
    planName,
    planType,
    subtitle: result.event.venueName,
    directions,
    layout: activeLayout,
    tables: (activeLayout.tables ?? []) as StudioTableConfig[],
    ceremonyRows: (activeLayout.ceremonyRows ?? []) as CeremonyRow[],
  });

  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const filename = venueMapFilename(planName, planType);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not generate the venue map image." },
      { status: 500 }
    );
  }
}
