import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { designGeneratorService } from "@/services/template-engine/design-generator.service";
import { parsePaginationFromUrl, PUBLIC_GRID_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") ?? undefined;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });

  const designs = await designGeneratorService.getUserDesigns(session.user.id, eventId, page, limit);
  return NextResponse.json({ success: true, data: designs });
}
