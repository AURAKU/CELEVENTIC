import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { paymentService } from "@/services/payments/payment.service";
import { SMARTCARD_PAYMENT_KIND } from "@/lib/digital-business-card/plans";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  try {
    const payment = await paymentService.confirmReference(reference);
    if (payment.userId && payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const meta = payment.metadata as Record<string, unknown> | null;
    if (meta?.kind !== SMARTCARD_PAYMENT_KIND) {
      return NextResponse.json({ error: "Not a CeleCard payment" }, { status: 400 });
    }
    const cardId = typeof meta.cardId === "string" ? meta.cardId : null;
    const card = cardId
      ? await prisma.digitalBusinessCard.findFirst({
          where: { id: cardId, userId: session.user.id },
        })
      : null;

    return NextResponse.json({
      success: true,
      data: {
        status: payment.status,
        live: card ? isDigitalCardLive(card) : false,
        cardId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Confirm failed" },
      { status: 400 }
    );
  }
}
