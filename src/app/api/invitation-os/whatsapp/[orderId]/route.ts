import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invitationSharingService } from "@/services/invitation-os/invitation-sharing.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const order = await prisma.invitationOrder.findFirst({
    where: { id: orderId, userId: session.user.id },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sharePath = order.shareUrl
    ? order.shareUrl.replace(process.env.NEXT_PUBLIC_APP_URL ?? "", "")
    : `/invitations/create/${orderId}/preview`;

  const pack = invitationSharingService.buildWhatsAppPack({
    eventTitle: order.eventTitle ?? "Your Celebration",
    eventDate: order.eventDate?.toISOString(),
    venue: order.venueName ?? undefined,
    sharePath: order.shareUrl ?? sharePath,
    hostName: order.hostName ?? undefined,
  });

  const guests = order.eventId
    ? await prisma.guest.findMany({ where: { eventId: order.eventId }, take: 100 })
    : [];

  return NextResponse.json({
    success: true,
    data: {
      ...pack,
      whatsAppGeneralUrl: invitationSharingService.whatsAppUrl(pack.generalText),
      guestMessages: guests.map((g) => ({
        guestId: g.id,
        name: g.name,
        message: pack.guestMessage(g.name, g.qrToken),
        link: pack.guestPersonalizedLink(g.qrToken, g.name),
        whatsAppUrl: invitationSharingService.whatsAppUrl(pack.guestMessage(g.name, g.qrToken)),
      })),
      bulkText: pack.bulkCampaignText(order.eventTitle ?? "Event", guests.length),
    },
  });
}
