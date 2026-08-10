import { NextResponse } from "next/server";
import { getPublicGuideBySlug, recordGuideFeedback } from "@/services/celeventic-guide/guide.service";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const guide = await getPublicGuideBySlug(slug);
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const helpful = !!body.helpful;
  await recordGuideFeedback(guide.slug, helpful);
  return NextResponse.json({ success: true });
}
