import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/services/payments/payment.service";
import { contributionService } from "@/services/contributions/contribution.service";

const schema = z.object({
  reference: z.string().min(8).max(128),
});

/**
 * Guest return path after Paystack. Confirms the provider charge and attaches
 * the Contribution (+ wallet) row to the event so organisers see who paid even
 * when the webhook is delayed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference } = schema.parse(body);

    const payment = await paymentService.confirmReference(reference);
    if (payment.purpose !== "CONTRIBUTION") {
      return NextResponse.json({ error: "Not a contribution payment" }, { status: 400 });
    }

    if (payment.status !== "SUCCESSFUL") {
      return NextResponse.json({
        success: true,
        data: {
          status: payment.status,
          recorded: false,
          reference: payment.reference,
        },
      });
    }

    // confirmReference already ran onPaymentSuccess; re-check for the row.
    let contribution = await prisma.contribution.findUnique({
      where: { paymentId: payment.id },
    });

    if (!contribution) {
      const meta = payment.metadata as Record<string, unknown> | null;
      const eventId = typeof meta?.eventId === "string" ? meta.eventId : null;
      const contributor =
        typeof meta?.contributor === "string" && meta.contributor.trim()
          ? meta.contributor.trim()
          : null;
      if (eventId && contributor) {
        const purposeRaw = typeof meta?.purpose === "string" ? meta.purpose : undefined;
        const purpose = [
          "FAMILY_SUPPORT",
          "BURIAL_SUPPORT",
          "MEMORIAL_FUND",
          "CHARITY_DONATION",
          "CHURCH_SUPPORT",
          "GENERAL",
        ].includes(purposeRaw ?? "")
          ? (purposeRaw as import("@prisma/client").ContributionPurpose)
          : "FAMILY_SUPPORT";
        contribution = await contributionService.createFromPayment(
          payment.id,
          {
            eventId,
            contributor,
            message: typeof meta?.message === "string" ? meta.message : undefined,
            isAnonymous: Boolean(meta?.isAnonymous),
            purpose,
            paymentMethod:
              typeof meta?.paymentMethod === "string" ? meta.paymentMethod : undefined,
            payerEmail:
              typeof meta?.payerEmail === "string"
                ? meta.payerEmail
                : typeof meta?.email === "string"
                  ? meta.email
                  : undefined,
            paymentReference: payment.reference,
          },
          Number(payment.amount),
          payment.currency
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: payment.status,
        recorded: Boolean(contribution),
        reference: payment.reference,
        contributionId: contribution?.id ?? null,
        contributor: contribution?.isAnonymous ? "Anonymous" : contribution?.contributor ?? null,
        amount: contribution ? String(contribution.amount) : String(payment.amount),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
