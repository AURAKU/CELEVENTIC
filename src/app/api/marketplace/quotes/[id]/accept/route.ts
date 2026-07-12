import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceQuoteService } from "@/services/marketplace/marketplace-quote.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const booking = await marketplaceQuoteService.acceptQuote(id, session.user.id);
    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Accept failed" },
      { status: 400 }
    );
  }
}
