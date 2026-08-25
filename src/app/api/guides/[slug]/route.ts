import { NextResponse } from "next/server";
import { getPublicGuideBySlug, seedCeleventicGuides } from "@/services/celeventic-guide/guide.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  let guide = await getPublicGuideBySlug(slug);
  if (!guide) {
    await seedCeleventicGuides();
    guide = await getPublicGuideBySlug(slug);
  }
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    slug: guide.slug,
    title: guide.title,
    summary: guide.summary,
    role: guide.role,
    category: guide.category,
    posterUrl: guide.posterUrl,
    hasVideo: !!guide.videoUrl,
  });
}
