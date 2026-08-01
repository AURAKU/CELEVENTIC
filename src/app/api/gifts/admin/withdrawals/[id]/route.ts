import { NextResponse } from "next/server";
import { requireGiftFinanceAccess } from "@/lib/gifts/gift-guard";
import { giftWithdrawalService } from "@/services/gifts/gift-withdrawal.service";
import { isAdminRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Organiser/admin withdrawal actions:
 * approve | reject | mark_paid (manual evidence) | mark_failed | cancel
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const action = typeof body?.action === "string" ? body.action : null;

  const guard = await requireGiftFinanceAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const isPlatformAdmin = isAdminRole(guard.access.role);

  try {
    let row;
    switch (action) {
      case "approve":
        row = await giftWithdrawalService.approve({
          withdrawalId: id,
          eventId: guard.eventId,
          actorId: guard.userId,
          isPlatformAdmin,
          note: typeof body?.note === "string" ? body.note : null,
        });
        break;
      case "reject":
        row = await giftWithdrawalService.reject({
          withdrawalId: id,
          eventId: guard.eventId,
          actorId: guard.userId,
          isPlatformAdmin,
          reason: typeof body?.reason === "string" ? body.reason : null,
        });
        break;
      case "mark_paid":
        row = await giftWithdrawalService.markManualPaid({
          withdrawalId: id,
          eventId: guard.eventId,
          actorId: guard.userId,
          isPlatformAdmin,
          evidenceReference: String(body?.evidenceReference || ""),
          providerReference:
            typeof body?.providerReference === "string" ? body.providerReference : null,
          note: typeof body?.note === "string" ? body.note : null,
        });
        break;
      case "mark_failed":
        row = await giftWithdrawalService.markFailed({
          withdrawalId: id,
          eventId: guard.eventId,
          actorId: guard.userId,
          reason: typeof body?.reason === "string" ? body.reason : null,
        });
        break;
      case "cancel":
        row = await giftWithdrawalService.cancel({
          withdrawalId: id,
          eventId: guard.eventId,
          actorId: guard.userId,
        });
        break;
      default:
        return NextResponse.json({ error: "Unknown withdrawal action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: giftWithdrawalService.toOrganiserView(row),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Withdrawal action failed" },
      { status: 400 }
    );
  }
}
