import { NextRequest, NextResponse } from "next/server";
import { isDemoCardSlug, DEMO_CARD_SLUG, getDemoCardBySlug } from "@/lib/digital-business-card/demo-card";
import { resolveCeleYouCardSlug } from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

async function targetSlug(raw: string) {
  if (isDemoCardSlug(raw)) return DEMO_CARD_SLUG;
  if (getDemoCardBySlug(raw)) return raw;
  return resolveCeleYouCardSlug(raw);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const slug = await targetSlug(username);
  if (!slug) return new NextResponse(null, { status: 404 });
  const url = new URL(`/card/${encodeURIComponent(slug)}/og${req.nextUrl.search}`, req.url);
  return NextResponse.redirect(url, 308);
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ username: string }> }) {
  return GET(req, ctx);
}
