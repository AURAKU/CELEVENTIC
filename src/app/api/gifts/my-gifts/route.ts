import { NextResponse } from "next/server";
import { giftAdminService } from "@/services/gifts/gift-admin.service";
import { giftReceiptService } from "@/services/gifts/gift-receipt.service";
import { requireSignedInUser } from "@/lib/gifts/gift-guard";
import { getServerAppUrl } from "@/lib/app-url";
import { formatMinor } from "@/lib/gifts/money";
import { GIFT_TYPE_LABELS } from "@/lib/gifts/gift-copy";
import { giftPaymentUiState } from "@/lib/gifts/gift-privacy";

export const dynamic = "force-dynamic";

/**
 * "My Gifts", gifts the signed-in user sent, scoped to their own user id.
 * A guest without an account reaches the same information through their signed
 * receipt link instead.
 */
export async function GET(req: Request) {
  const auth = await requireSignedInUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const page = new URL(req.url).searchParams.get("page");
  const [result, baseUrl] = await Promise.all([
    giftAdminService.listMyGifts(auth.userId, { page }),
    getServerAppUrl(),
  ]);

  const items = await Promise.all(
    result.items.map(async (gift) => {
      const token =
        gift.status === "SUCCESS" ? await giftReceiptService.tokenForPayment(gift.id) : null;
      return {
        id: gift.id,
        reference: gift.reference,
        status: gift.status,
        state: giftPaymentUiState(gift.status),
        amountFormatted: formatMinor(gift.amountMinor, gift.currency),
        amountMinor: gift.amountMinor,
        currency: gift.currency,
        giftTypeLabel: GIFT_TYPE_LABELS[gift.giftType],
        eventTitle: gift.event.title,
        hostName: gift.event.hostName,
        createdAt: gift.createdAt.toISOString(),
        paidAt: gift.paidAt ? gift.paidAt.toISOString() : null,
        receiptUrl: token ? `${baseUrl}/gift/receipt/${token}` : null,
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: { ...result, items },
  });
}
