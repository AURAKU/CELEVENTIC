import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { templateMarketplaceService } from "@/services/template-engine/template-marketplace.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, limit } = parsePaginationFromUrl(req.url, { limit: 50 });
  const favorites = await templateMarketplaceService.getFavorites(session.user.id, page, limit);
  return NextResponse.json({ success: true, data: favorites });
}
