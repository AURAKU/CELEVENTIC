import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceBookingService } from "@/services/marketplace/marketplace-booking.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const booking = await marketplaceBookingService.requestCompletion(id, session.user.id);
    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delivery request failed" },
      { status: 400 }
    );
  }
}
