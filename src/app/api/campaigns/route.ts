import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { communicationService } from "@/services/communications/communication.service";
import { verifyEventAccess } from "@/lib/event-access";

const createSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(2),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  message: z.string().min(10),
  recipients: z.array(z.object({
    name: z.string().optional(),
    contact: z.string(),
  })),
  guestTier: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.action === "preview") {
      const preview = communicationService.previewCampaign(
        body.channel,
        body.message,
        body.recipientCount ?? 0
      );
      return NextResponse.json({ success: true, data: preview });
    }

    if (body.action === "send") {
      const sendSchema = z.object({
        campaignId: z.string(),
        eventId: z.string(),
        email: z.string().email(),
      });
      const data = sendSchema.parse(body);
      await verifyEventAccess(data.eventId, session.user.id, session.user.role);

      const { prisma } = await import("@/lib/prisma");
      const campaign = await prisma.campaign.findUnique({
        where: { id: data.campaignId },
        include: { _count: { select: { messages: true } } },
      });
      if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

      const preview = communicationService.previewCampaign(
        campaign.channel,
        campaign.message,
        campaign._count.messages
      );

      const { paymentService } = await import("@/services/payments/payment.service");
      const result = await paymentService.initializePayment(
        session.user.id,
        "PAYSTACK",
        "BULK_MESSAGING",
        {
          amount: preview.estimatedCost,
          email: data.email,
          purpose: "BULK_MESSAGING",
          metadata: { eventId: data.eventId, campaignId: data.campaignId },
        },
        { campaignId: data.campaignId }
      );

      return NextResponse.json({ success: true, data: result });
    }

    const data = createSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const campaign = await communicationService.createCampaign({
      ...data,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign creation failed" }, { status: 500 });
  }
}
