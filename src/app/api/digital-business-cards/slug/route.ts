import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { proposeDigitalCardSlug } from "@/services/digital-business-card/digital-business-card.service";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const preferred = url.searchParams.get("slug") || url.searchParams.get("preferred") || "";
  const displayName = url.searchParams.get("displayName") || "";
  const company = url.searchParams.get("company") || "";
  const title = url.searchParams.get("title") || "";
  const excludeId = url.searchParams.get("excludeId") || undefined;

  if (!preferred.trim() && displayName.trim().length < 2) {
    return NextResponse.json({ success: true, data: { requested: "", slug: "", available: true, adjusted: false } });
  }

  const data = await proposeDigitalCardSlug({
    preferred,
    displayName,
    company,
    title,
    excludeId,
  });
  return NextResponse.json({ success: true, data });
}
