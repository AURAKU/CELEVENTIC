import { prisma } from "@/lib/prisma";

export async function getPublicEventSite(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      invitations: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { uniqueLink: true, name: true },
      },
      tickets: {
        where: { status: { in: ["PENDING", "PAID"] } },
        orderBy: { price: "asc" },
        take: 6,
      },
    },
  });

  if (!event || !event.isPublic || !["PUBLISHED", "LIVE"].includes(event.status)) {
    return null;
  }

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    eventType: event.eventType,
    hostName: event.hostName,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    venueName: event.venueName,
    landmark: event.landmark,
    mapsLink: event.mapsLink,
    contactPhone: event.contactPhone,
    dressCode: event.dressCode,
    coverImageUrl: event.coverImageUrl,
    city: event.city,
    country: event.country,
    pricingType: event.pricingType,
    media: event.media.map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      caption: m.caption,
    })),
    primaryInvitation: event.invitations[0] ?? null,
    tickets: event.tickets.map((t) => ({
      id: t.id,
      name: t.name,
      price: Number(t.price),
      type: t.type,
    })),
  };
}
