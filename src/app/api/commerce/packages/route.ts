import { NextResponse } from "next/server";
import { catalogService } from "@/services/commerce/catalog.service";

export async function GET() {
  const packages = await catalogService.getActivePackages();
  return NextResponse.json({ success: true, data: packages });
}
