import { NextResponse } from "next/server";
import { INVITATION_TEMPLATE_PRESETS } from "@/lib/invitation-templates";
import { paginatedResult, parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  const { page, limit, skip } = parsePaginationFromUrl(req.url);
  const all = INVITATION_TEMPLATE_PRESETS.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    preview: t.preview,
    config: t.config,
  }));
  const total = all.length;
  const items = all.slice(skip, skip + limit);
  return NextResponse.json({ success: true, data: paginatedResult(items, total, page, limit) });
}
