import { NextResponse } from "next/server";
import { queryCatalog } from "@/lib/invitation-mvp/catalogue-query";

/**
 * Cursor-paginated invitation catalogue (Studio 2.0 gallery contract):
 * GET /api/invitations/catalogue?category=&tier=&tags=&colorFamily=&hasParallax=&cursor=&limit=
 * → { items, nextCursor, total }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get("limit") ?? 12);
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 48) : 12;

  const result = queryCatalog(
    {
      category: searchParams.get("category") ?? undefined,
      tier: searchParams.get("tier") ?? undefined,
      style: searchParams.get("style") ?? undefined,
      mood: searchParams.get("mood") ?? undefined,
      colorFamily: searchParams.get("colorFamily") ?? undefined,
      hasParallax: searchParams.get("hasParallax") === "true",
      tags: searchParams.get("tags")?.split(",").filter(Boolean),
      search: searchParams.get("search") ?? undefined,
    },
    searchParams.get("cursor"),
    limit
  );

  return NextResponse.json({ success: true, data: result });
}
