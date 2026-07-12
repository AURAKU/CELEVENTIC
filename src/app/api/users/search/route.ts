import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchUsers } from "@/services/workspace/onboarding.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const pagination = parsePaginationFromUrl(url);

  const result = await searchUsers(q, pagination);
  return NextResponse.json({ success: true, data: result });
}
