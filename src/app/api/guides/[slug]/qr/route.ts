import { NextResponse } from "next/server";
import { getPublicGuideBySlug } from "@/services/celeventic-guide/guide.service";
import { generateBrandedQrPng } from "@/lib/qr/branded-qr-generator";
import { getAppUrlFromEnv } from "@/lib/app-url";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const guide = await getPublicGuideBySlug(slug);
  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = `${getAppUrlFromEnv()}/guide/${guide.slug}`;
  const png = await generateBrandedQrPng(url, undefined, 512, "brand");
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
