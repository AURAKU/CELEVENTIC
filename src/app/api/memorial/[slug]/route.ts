import { NextResponse } from "next/server";
import { funeralService } from "@/services/funeral/funeral.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const section = url.searchParams.get("section") ?? "overview";
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

  const memorial = await funeralService.getMemorialPage(slug, section, page, limit);

  if (!memorial) {
    return NextResponse.json({ error: "Memorial not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: memorial });
}
