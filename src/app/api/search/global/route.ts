import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { globalSearch } from "@/services/workspace/global-search.service";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const types = url.searchParams.get("types")?.split(",").filter(Boolean);

  const results = await globalSearch(session.user.id, q, types);
  return NextResponse.json({ success: true, data: results });
}
