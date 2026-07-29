import { prisma } from "@/lib/prisma";

type PublicInvitationLink = {
  id: string;
  uniqueLink: string;
  name: string;
};

export function choosePrimaryInvitation(
  canonical: PublicInvitationLink | null,
  newestActive: PublicInvitationLink | null
): PublicInvitationLink | null {
  return canonical ?? newestActive;
}

export async function getPublicEventSite(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      invitations: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, uniqueLink: true, name: true },
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

  // Quick invites and imports create newer personalized Invitation rows. The
  // public event CTA must keep pointing at the canonical invitation published
  // by Studio, not whichever guest row happened to be created most recently.
  const productionOrder = await prisma.invitationOrder.findFirst({
    where: {
      eventId: event.id,
      status: "PUBLISHED",
      invitationId: { not: null },
      shareUrl: { not: null },
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: { invitationId: true },
  });
  const fallbackInvitation = event.invitations[0] ?? null;
  const canonicalInvitation =
    productionOrder?.invitationId &&
    productionOrder.invitationId !== fallbackInvitation?.id
      ? await prisma.invitation.findFirst({
          where: {
            id: productionOrder.invitationId,
            eventId: event.id,
            status: "ACTIVE",
          },
          select: { id: true, uniqueLink: true, name: true },
        })
      : null;
  const primaryInvitation = choosePrimaryInvitation(
    canonicalInvitation,
    fallbackInvitation
  );

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
    primaryInvitation: primaryInvitation
      ? {
          uniqueLink: primaryInvitation.uniqueLink,
          name: primaryInvitation.name,
        }
      : null,
    tickets: event.tickets.map((t) => ({
      id: t.id,
      name: t.name,
      price: Number(t.price),
      type: t.type,
    })),
  };
}
