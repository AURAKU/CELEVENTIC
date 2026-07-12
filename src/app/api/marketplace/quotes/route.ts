import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceQuoteService } from "@/services/marketplace/marketplace-quote.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, limit } = parsePaginationFromUrl(req.url);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  const vendor = await prisma.vendor.findFirst({ where: { userId: session.user.id } });
  const data = vendor
    ? await marketplaceQuoteService.listQuotes({ vendorId: vendor.id, status: status as never, page, limit })
    : await marketplaceQuoteService.listQuotes({ organizerId: session.user.id, status: status as never, page, limit });

  return NextResponse.json({ success: true, data });
}

const sendSchema = z.object({
  leadId: z.string(),
  title: z.string().optional(),
  amount: z.number().positive(),
  depositAmount: z.number().positive().optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  cancellationTerms: z.string().optional(),
  notes: z.string().optional(),
  expiresAt: z.string().optional(),
  currency: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendor.findFirst({ where: { userId: session.user.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

  try {
    const body = sendSchema.parse(await req.json());
    const quote = await marketplaceQuoteService.sendQuote({
      ...body,
      vendorId: vendor.id,
      vendorUserId: session.user.id,
    });
    return NextResponse.json({ success: true, data: quote }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send quote" },
      { status: 400 }
    );
  }
}
