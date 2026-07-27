import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { giftAdminService } from "@/services/gifts/gift-admin.service";
import { giftPaymentService, GiftPaymentError } from "@/services/gifts/gift-payment.service";
import { giftReceiptService } from "@/services/gifts/gift-receipt.service";
import { requireGiftFinanceAccess } from "@/lib/gifts/gift-guard";
import { getServerAppUrl } from "@/lib/app-url";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("note"), eventId: z.string().min(1), note: z.string().max(1000) }),
  z.object({ action: z.literal("reconcile"), eventId: z.string().min(1) }),
  z.object({ action: z.literal("reverify"), eventId: z.string().min(1) }),
  z.object({
    action: z.literal("refund"),
    eventId: z.string().min(1),
    reason: z.string().trim().min(3).max(300),
    amountMinor: z.number().int().positive().optional(),
  }),
]);

/**
 * Per-transaction organiser actions: add a note, mark reconciled, re-verify
 * against the provider, or refund. Refund is owner-only because it moves money
 * back out of the wallet.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const data = schema.parse(await req.json());
    const guard = await requireGiftFinanceAccess(data.eventId);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const gift = await prisma.eventGiftPayment.findFirst({
      where: { id, eventId: guard.eventId },
    });
    if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });

    switch (data.action) {
      case "note": {
        await giftAdminService.setNote(id, guard.eventId, data.note);
        await createAuditLog({
          userId: guard.userId,
          action: "UPDATE",
          entity: "event_gift_payment",
          entityId: id,
          details: { action: "NOTE" },
        });
        return NextResponse.json({ success: true });
      }

      case "reconcile": {
        await giftAdminService.markReconciled(id, guard.eventId, guard.userId);
        const reconciliation = await eventWalletReconcile(guard.eventId);
        await createAuditLog({
          userId: guard.userId,
          action: "UPDATE",
          entity: "event_gift_payment",
          entityId: id,
          details: { action: "RECONCILE", ...reconciliation },
        });
        return NextResponse.json({ success: true, data: reconciliation });
      }

      case "reverify": {
        const result = await giftPaymentService.fulfilFromProvider(
          gift.reference,
          "organiser_verify"
        );
        await createAuditLog({
          userId: guard.userId,
          action: "PAYMENT",
          entity: "event_gift_payment",
          entityId: id,
          details: { action: "REVERIFY", status: result.status },
        });
        return NextResponse.json({ success: true, data: { status: result.status } });
      }

      case "refund": {
        if (!guard.canRefund) {
          return NextResponse.json(
            { error: "Only the event owner can issue a gift refund" },
            { status: 403 }
          );
        }
        const refunded = await giftPaymentService.refund({
          giftPaymentId: id,
          actorId: guard.userId,
          reason: data.reason,
          amountMinor: data.amountMinor,
        });
        return NextResponse.json({ success: true, data: { status: refunded.status } });
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error instanceof GiftPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gifts.admin.transaction]", error);
    return NextResponse.json({ error: "Could not complete that action" }, { status: 500 });
  }
}

/** Organiser view of one gift, including its receipt link. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireGiftFinanceAccess(new URL(req.url).searchParams.get("eventId"));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const gift = await prisma.eventGiftPayment.findFirst({
    where: { id, eventId: guard.eventId },
    include: {
      receipt: { select: { id: true, receiptNumber: true, revokedAt: true, issuedAt: true } },
      ledgerEntries: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!gift) return NextResponse.json({ error: "Gift not found" }, { status: 404 });

  const [baseUrl, receiptToken] = await Promise.all([
    getServerAppUrl(),
    giftReceiptService.tokenForPayment(gift.id).catch(() => null),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      gift,
      receiptUrl: receiptToken ? `${baseUrl}/gift/receipt/${receiptToken}` : null,
    },
  });
}

async function eventWalletReconcile(eventId: string) {
  const { eventWalletService } = await import("@/services/gifts/event-wallet.service");
  return eventWalletService.reconcile(eventId);
}
