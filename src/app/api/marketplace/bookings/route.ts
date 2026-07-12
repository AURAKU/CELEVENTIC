import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { marketplaceBookingService } from "@/services/marketplace/marketplace-booking.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { page, limit } = parsePaginationFromUrl(req.url);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  const vendor = await prisma.vendor.findFirst({ where: { userId: session.user.id } });
  const data = vendor
    ? await marketplaceBookingService.listBookings({ vendorId: vendor.id, status: status as never, page, limit })
    : await marketplaceBookingService.listBookings({ organizerId: session.user.id, status: status as never, page, limit });

  return NextResponse.json({ success: true, data });
}
