import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceQuoteService } from "@/services/marketplace/marketplace-quote.service";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quote = await marketplaceQuoteService.getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const vendor = await prisma.vendor.findFirst({ where: { userId: session.user.id } });
  const allowed =
    quote.organizerId === session.user.id || (vendor && quote.vendorId === vendor.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (quote.organizerId === session.user.id && quote.status === "SENT") {
    await marketplaceQuoteService.markViewed(id, session.user.id);
  }

  return NextResponse.json({ success: true, data: quote });
}
