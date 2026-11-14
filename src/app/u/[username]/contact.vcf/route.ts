import { NextRequest, NextResponse } from "next/server";
import { DEMO_CARD_SLUG, getDemoCardBySlug, isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouCardSlug } from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const slug = isDemoCardSlug(username)
    ? DEMO_CARD_SLUG
    : getDemoCardBySlug(username)
      ? username
      : await resolveCeleYouCardSlug(username);
  if (!slug) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(new URL(`/card/${encodeURIComponent(slug)}/contact.vcf`, req.url), 308);
}
