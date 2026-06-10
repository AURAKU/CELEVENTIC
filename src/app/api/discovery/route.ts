import { NextResponse } from "next/server";
import { discoveryService } from "@/services/discovery/discovery.service";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const events = await discoveryService.discover({
    city: params.get("city") ?? undefined,
    country: params.get("country") ?? "GH",
    eventType: params.get("type") ?? undefined,
    latitude: params.get("lat") ? parseFloat(params.get("lat")!) : undefined,
    longitude: params.get("lng") ? parseFloat(params.get("lng")!) : undefined,
    radiusKm: params.get("radius") ? parseInt(params.get("radius")!) : undefined,
    page: params.get("page") ? parseInt(params.get("page")!) : 1,
  });

  return NextResponse.json({ success: true, data: events });
}
