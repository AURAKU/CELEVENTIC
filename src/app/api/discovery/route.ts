import { NextResponse } from "next/server";
import { discoveryService } from "@/services/discovery/discovery.service";
import { parsePaginationFromUrl, PUBLIC_GRID_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });

  const result = await discoveryService.discover({
    city: params.get("city") ?? undefined,
    country: params.get("country") ?? "GH",
    eventType: params.get("type") ?? undefined,
    latitude: params.get("lat") ? parseFloat(params.get("lat")!) : undefined,
    longitude: params.get("lng") ? parseFloat(params.get("lng")!) : undefined,
    radiusKm: params.get("radius") ? parseInt(params.get("radius")!) : undefined,
    page,
    limit,
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      events: result.items.map((e) => ({
        ...e,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    },
  });
}
