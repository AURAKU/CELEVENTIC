import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";
import { prisma } from "@/lib/prisma";
import { isAdminCommerceBypass } from "@/lib/access/package-access";
import { addonFulfillmentService } from "@/services/invitation-os/addon-fulfillment.service";

/**
 * Publishes a paid (or free-unlocked) invitation after studio customization.
 * Platform admins may publish without prior payment (auto-unlock).
 * Idempotent: returns existing share URL when already published.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    let order = await invitationOrderService.getOrderForUser(id, session.user.id);

    if (!order.eventTitle || !order.eventDate) {
      return NextResponse.json({ error: "Complete event details before publishing" }, { status: 400 });
    }

    const publishableStatuses = new Set([
      "PAID",
      "IN_PRODUCTION",
      "APPROVED",
      "PUBLISHED",
      "REVISION_REQUESTED",
    ]);

    if (!publishableStatuses.has(order.status)) {
      if (!isAdminCommerceBypass(session.user.role)) {
        return NextResponse.json(
          { error: "Complete payment before publishing your invitation" },
          { status: 402 }
        );
      }
      await prisma.invitationOrder.update({
        where: { id: order.id },
        data: { status: "PAID", workflowStage: "PAYMENT_SUCCESSFUL", totalAmountGhs: 0 },
      });
      await addonFulfillmentService.fulfillOrderAddons(order.id);
      order = await invitationOrderService.getOrderForUser(id, session.user.id);
    }

    if (order.shareUrl && order.invitationId) {
      return NextResponse.json({
        success: true,
        data: {
          shareUrl: order.shareUrl,
          invitationId: order.invitationId,
          alreadyPublished: true,
        },
      });
    }

    const result = await invitationOrderService.publishFromPayment(order.id);
    await prisma.invitationOrder.update({
      where: { id: order.id },
      data: { status: "PUBLISHED", workflowStage: "PUBLISHED" },
    });

    return NextResponse.json({
      success: true,
      data: {
        shareUrl: result.shareUrl,
        invitationId: result.invitation.id,
        alreadyPublished: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 }
    );
  }
}
