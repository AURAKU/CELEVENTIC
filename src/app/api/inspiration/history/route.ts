import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inspirationEngineService } from "@/services/inspiration/inspiration-engine.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await inspirationEngineService.getHistory(session.user.id, page, limit);
  return NextResponse.json({ success: true, data });
}
