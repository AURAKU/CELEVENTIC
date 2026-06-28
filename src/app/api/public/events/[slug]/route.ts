import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      tickets: {
        where: { status: "PAID" },
        orderBy: { price: "asc" },
      },
      package: { select: { name: true } },
    },
  });

  if (!event || !event.isPublic || !["PUBLISHED", "LIVE"].includes(event.status)) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      eventType: event.eventType,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      venueName: event.venueName,
      city: event.city,
      mapsLink: event.mapsLink,
      coverImageUrl: event.coverImageUrl,
      hostName: event.hostName,
      contactPhone: event.contactPhone,
      pricingType: event.pricingType,
      tickets: event.tickets.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        description: t.description,
        price: Number(t.price),
        soldCount: t.soldCount,
        maxQuantity: t.maxQuantity,
      })),
    },
  });
}
