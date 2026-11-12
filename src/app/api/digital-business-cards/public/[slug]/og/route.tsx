import { renderCeleCardOgBySlug } from "@/lib/digital-business-card/og-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300;

/** Alias of `/card/{slug}/og`. Kept so older share tiles keep resolving. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return renderCeleCardOgBySlug(slug);
}

export async function HEAD(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const res = await renderCeleCardOgBySlug(slug);
  return new Response(null, { status: res.status, headers: res.headers });
}
