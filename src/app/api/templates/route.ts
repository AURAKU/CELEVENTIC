import { NextResponse } from "next/server";
import { getUniqueTemplatePresets } from "@/lib/invitation-templates";
import { paginatedResult, parsePaginationFromUrl } from "@/lib/pagination";

/** Paginated template library for studio and marketplace consumers */
export async function GET(req: Request) {
  const { page, limit, skip } = parsePaginationFromUrl(req.url);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.toLowerCase();

  let items = getUniqueTemplatePresets().map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    preview: t.preview,
    layout: t.config.layout,
    isCinematic: t.config.experience?.introEnabled !== false,
  }));

  if (category && category !== "all") {
    items = items.filter((t) => t.category === category);
  }

  const total = items.length;
  const pageItems = items.slice(skip, skip + limit);

  return NextResponse.json({
    success: true,
    data: paginatedResult(pageItems, total, page, limit),
  });
}
