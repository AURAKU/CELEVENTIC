import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceBookingService } from "@/services/marketplace/marketplace-booking.service";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await marketplaceBookingService.getById(id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const vendor = await prisma.vendor.findFirst({ where: { userId: session.user.id } });
  const allowed =
    booking.organizerId === session.user.id || (vendor && booking.vendorId === vendor.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ success: true, data: booking });
}
