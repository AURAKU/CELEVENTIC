import { NextResponse } from "next/server";
import { catalogService } from "@/services/commerce/catalog.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventType = searchParams.get("eventType") ?? undefined;
  const packages = await catalogService.getActivePackages(eventType ?? undefined);
  return NextResponse.json({ success: true, data: packages });
}
