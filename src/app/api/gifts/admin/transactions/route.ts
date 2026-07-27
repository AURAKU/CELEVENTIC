import { NextResponse } from "next/server";
import { giftAdminService } from "@/services/gifts/gift-admin.service";
import { eventWalletService } from "@/services/gifts/event-wallet.service";
import { requireGiftFinanceAccess } from "@/lib/gifts/gift-guard";
import type { EventGiftPaymentStatus, EventGiftType } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Paginated, filterable gift transactions for the organiser dashboard. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const guard = await requireGiftFinanceAccess(url.searchParams.get("eventId"));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [transactions, summary, wallet] = await Promise.all([
    giftAdminService.listTransactions({
      eventId: guard.eventId,
      status: (url.searchParams.get("status") as EventGiftPaymentStatus | "ALL") ?? "ALL",
      giftType: (url.searchParams.get("giftType") as EventGiftType | "ALL") ?? "ALL",
      method: url.searchParams.get("method") ?? "ALL",
      search: url.searchParams.get("search"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    }),
    giftAdminService.summary(guard.eventId),
    eventWalletService.getSummary(guard.eventId),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      transactions,
      summary,
      wallet: {
        currency: wallet.account.currency,
        status: wallet.account.status,
        balanceMinor: wallet.account.balanceMinor,
        availableMinor: wallet.account.availableMinor,
        lifetimeGiftMinor: wallet.account.lifetimeGiftMinor,
        lifetimeRefundMinor: wallet.account.lifetimeRefundMinor,
        giftCount: wallet.account.giftCount,
        recentEntries: wallet.recentEntries,
      },
      permissions: { canRefund: guard.canRefund },
    },
  });
}
