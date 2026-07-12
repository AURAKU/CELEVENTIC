import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceQuoteService } from "@/services/marketplace/marketplace-quote.service";
import { z } from "zod";

const schema = z.object({ reason: z.string().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await marketplaceQuoteService.declineQuote(id, session.user.id, body.reason);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decline failed" },
      { status: 400 }
    );
  }
}
