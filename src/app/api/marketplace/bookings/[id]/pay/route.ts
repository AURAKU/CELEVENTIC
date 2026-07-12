import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { paymentService } from "@/services/payments/payment.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE", "HUBTEL"]).default("PAYSTACK"),
  email: z.string().email(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = schema.parse(await req.json());

    const booking = await prisma.vendorBooking.findFirst({
      where: { id, organizerId: session.user.id, deletedAt: null },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!["AWAITING_PAYMENT", "DEPOSIT_PAID"].includes(booking.status)) {
      return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 400 });
    }

    const amount =
      booking.status === "AWAITING_PAYMENT"
        ? Number(booking.depositAmount ?? booking.agreedAmount)
        : Number(booking.remainingAmount ?? 0);

    if (amount <= 0) return NextResponse.json({ error: "Nothing to pay" }, { status: 400 });

    const result = await paymentService.initializePayment(
      session.user.id,
      body.provider,
      "VENDOR_BOOKING",
      {
        email: body.email,
        amount,
        currency: booking.currency,
        purpose: "VENDOR_BOOKING",
        metadata: { bookingId: booking.id, vendorId: booking.vendorId },
      },
      {
        vendorBookingId: booking.id,
        idempotencyKey: `vendor-booking-${booking.id}-${booking.status}`,
      }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment init failed" },
      { status: 400 }
    );
  }
}
