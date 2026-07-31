import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl, paginatedResult, PUBLIC_GRID_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { page, limit, skip } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });
  const where = { userId: session.user.id };
  const [items, total] = await Promise.all([
    prisma.vendorFavorite.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true, slug: true, businessName: true, category: true, city: true,
            profileImage: true, rating: true, isVerified: true, isFeatured: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.vendorFavorite.count({ where }),
  ]);
  return NextResponse.json({ success: true, data: paginatedResult(items, total, page, limit) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { vendorId } = z.object({ vendorId: z.string() }).parse(await req.json());
  const fav = await prisma.vendorFavorite.upsert({
    where: { userId_vendorId: { userId: session.user.id, vendorId } },
    update: {},
    create: { userId: session.user.id, vendorId },
  });
  return NextResponse.json({ success: true, data: fav });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendorId = new URL(req.url).searchParams.get("vendorId");
  if (!vendorId) return NextResponse.json({ error: "vendorId required" }, { status: 400 });
  await prisma.vendorFavorite.deleteMany({ where: { userId: session.user.id, vendorId } });
  return NextResponse.json({ success: true });
}
