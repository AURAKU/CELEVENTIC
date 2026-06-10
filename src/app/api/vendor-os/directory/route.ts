import { NextResponse } from "next/server";
import { vendorDirectoryService } from "@/services/vendor-os/vendor-directory.service";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const data = await vendorDirectoryService.search({
    search: p.get("search") ?? undefined,
    category: p.get("category") ?? undefined,
    city: p.get("city") ?? undefined,
    region: p.get("region") ?? undefined,
    verified: p.get("verified") === "true",
    featured: p.get("featured") === "true",
    minRating: p.get("minRating") ? Number(p.get("minRating")) : undefined,
    availableDate: p.get("date") ?? undefined,
    sort: (p.get("sort") as "recommended" | "newest" | "rating" | "verified" | "featured") ?? "recommended",
    page: p.get("page") ? Number(p.get("page")) : 1,
    limit: p.get("limit") ? Number(p.get("limit")) : 24,
  });
  const categories = await vendorDirectoryService.getCategories();
  return NextResponse.json({ success: true, data: { ...data, categories } });
}
