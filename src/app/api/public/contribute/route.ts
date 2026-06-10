import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/services/payments/payment.service";

const schema = z.object({
  eventSlug: z.string(),
  contributor: z.string().min(2),
  email: z.string().email(),
  amount: z.number().positive(),
  message: z.string().optional(),
  isAnonymous: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const event = await prisma.event.findUnique({
      where: { slug: data.eventSlug },
      include: { funeralProfile: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.eventType !== "FUNERAL" && !event.funeralProfile) {
      return NextResponse.json({ error: "Contributions not enabled for this event" }, { status: 403 });
    }

    if (event.funeralProfile?.privacyStatus === "PRIVATE") {
      return NextResponse.json({ error: "This memorial is private" }, { status: 403 });
    }

    const result = await paymentService.initializePayment(
      undefined,
      "PAYSTACK",
      "CONTRIBUTION",
      {
        amount: data.amount,
        email: data.email,
        purpose: "CONTRIBUTION",
        metadata: {
          eventId: event.id,
          contributor: data.contributor,
          message: data.message,
          isAnonymous: data.isAnonymous ?? false,
        },
      }
    );

    if (!result.authorizationUrl) {
      return NextResponse.json(
        { error: "Payment provider is not configured. Please try again later or contact the organizer." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          requiresPayment: true,
          reference: result.payment.reference,
          authorizationUrl: result.authorizationUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Contribution failed" }, { status: 500 });
  }
}
