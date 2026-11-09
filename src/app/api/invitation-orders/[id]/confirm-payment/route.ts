import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/services/payments/payment.service";
import { unlockPaidInvitationPackage } from "@/services/packages/unlock-paid-package.service";
import { isStudioUnlocked } from "@/lib/invitation/studio-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reference?: string };
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";

  const order = await prisma.invitationOrder.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true, packageSlug: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (reference) {
    const payment = await prisma.payment.findFirst({
      where: {
        reference,
        OR: [{ invitationOrderId: order.id }, { userId: session.user.id }],
      },
      select: { id: true, invitationOrderId: true, status: true },
    });
    if (payment && payment.invitationOrderId && payment.invitationOrderId !== order.id) {
      return NextResponse.json({ error: "Payment does not match this order" }, { status: 403 });
    }
    try {
      await paymentService.confirmReference(reference);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not confirm payment" },
        { status: 400 }
      );
    }
  }

  const refreshed = await prisma.invitationOrder.findUnique({
    where: { id: order.id },
    select: { status: true },
  });
  if (!isStudioUnlocked(refreshed?.status)) {
    return NextResponse.json(
      { error: "Payment is not complete yet. If you were charged, wait a moment and retry." },
      { status: 402 }
    );
  }

  const unlock = await unlockPaidInvitationPackage(order.id);
  return NextResponse.json({
    success: true,
    data: {
      unlockStudio: true,
      next: unlock.nextPath,
      threadId: unlock.threadId,
    },
  });
}
