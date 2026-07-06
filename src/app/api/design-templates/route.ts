import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { templateEngineService } from "@/services/template-engine/template-engine.service";
import { parsePaginationFromUrl, PUBLIC_GRID_LIMIT } from "@/lib/pagination";

const createSchema = z.object({
  schema: z.object({
    name: z.string(),
    category: z.string(),
    style: z.string(),
    productType: z.string(),
    canvas: z.object({ width: z.number(), height: z.number(), background: z.string() }),
    blocks: z.array(z.record(z.unknown())),
    colorPalette: z.record(z.string()).optional(),
    fontPairing: z.record(z.string()).optional(),
    variables: z.array(z.string()).optional(),
  }),
  isPremium: z.boolean().optional(),
  price: z.number().optional(),
});

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });
  const templates = await templateEngineService.list({
    category: params.get("category") ?? undefined,
    style: params.get("style") ?? undefined,
    productType: (params.get("productType") as never) ?? undefined,
    isPremium: params.get("premium") === "true" ? true : params.get("free") === "true" ? false : undefined,
    isFeatured: params.get("featured") === "true",
    search: params.get("search") ?? undefined,
    page,
    limit,
  });
  return NextResponse.json({ success: true, data: templates });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const template = await templateEngineService.create({
      createdById: session.user.id,
      schema: data.schema as never,
      isPremium: data.isPremium,
      price: data.price,
    });
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
