import { NextResponse } from "next/server";
import { pricingService } from "@/services/commerce/pricing.service";
import type { DisplayCurrency } from "@/lib/commerce/constants";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const packageSlug = url.searchParams.get("package");
  const addons = url.searchParams.get("addons")?.split(",").filter(Boolean) ?? [];
  const currency = (url.searchParams.get("currency") ?? "GHS") as DisplayCurrency;

  if (!packageSlug) {
    return NextResponse.json({ error: "package required" }, { status: 400 });
  }

  const pricing = await pricingService.calculateOrderPricing(packageSlug, addons, currency);
  return NextResponse.json({ success: true, data: pricing });
}
