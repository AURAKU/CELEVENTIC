import { NextResponse } from "next/server";
import { catalogService } from "@/services/commerce/catalog.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const packageSlug = searchParams.get("package") ?? undefined;
  const addons = await catalogService.getActiveAddons(packageSlug);
  return NextResponse.json({ success: true, data: addons });
}
