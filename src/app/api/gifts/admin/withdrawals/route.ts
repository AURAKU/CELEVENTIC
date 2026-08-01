import { NextResponse } from "next/server";
import { requireGiftFinanceAccess } from "@/lib/gifts/gift-guard";
import { giftWithdrawalService } from "@/services/gifts/gift-withdrawal.service";
import { eventWalletService } from "@/services/gifts/event-wallet.service";
import type { WithdrawalPayoutMethodId } from "@/lib/gifts/gift-withdrawal";
import { isAdminRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** List paginated withdrawals + wallet availability for the organiser gift wallet. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const guard = await requireGiftFinanceAccess(url.searchParams.get("eventId"));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [withdrawals, wallet] = await Promise.all([
    giftWithdrawalService.list(guard.eventId, {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      status: url.searchParams.get("status"),
    }),
    eventWalletService.getSummary(guard.eventId),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      withdrawals,
      wallet: {
        currency: wallet.account.currency,
        status: wallet.account.status,
        balanceMinor: wallet.account.balanceMinor,
        availableMinor: wallet.account.availableMinor,
        reservedMinor: wallet.account.reservedMinor,
        withdrawnMinor: wallet.account.lifetimeWithdrawnMinor,
      },
      permissions: {
        canRefund: guard.canRefund,
        canApproveWithdrawals: guard.access.isOwner || isAdminRole(guard.access.role),
        isPlatformAdmin: isAdminRole(guard.access.role),
        actorId: guard.userId,
      },
    },
  });
}

/** Request a new withdrawal (reserves available balance). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const guard = await requireGiftFinanceAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const withdrawal = await giftWithdrawalService.request({
      eventId: guard.eventId,
      requestedById: guard.userId,
      amountMinor: Number(body?.amountMinor),
      payoutMethod: String(body?.payoutMethod || "") as WithdrawalPayoutMethodId,
      payoutPhone: typeof body?.payoutPhone === "string" ? body.payoutPhone : null,
      bankCode: typeof body?.bankCode === "string" ? body.bankCode : null,
      bankAccountNumber:
        typeof body?.bankAccountNumber === "string" ? body.bankAccountNumber : null,
      accountName: typeof body?.accountName === "string" ? body.accountName : null,
      reason: typeof body?.reason === "string" ? body.reason : null,
      idempotencyKey:
        typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null,
    });

    return NextResponse.json({
      success: true,
      data: giftWithdrawalService.toOrganiserView(withdrawal),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not request withdrawal" },
      { status: 400 }
    );
  }
}
