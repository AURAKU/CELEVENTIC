import { NextResponse } from "next/server";
import { giftAdminService } from "@/services/gifts/gift-admin.service";
import { requireGiftFinanceAccess } from "@/lib/gifts/gift-guard";
import { createAuditLog } from "@/lib/audit";
import type { EventGiftPaymentStatus, EventGiftType } from "@prisma/client";

export const dynamic = "force-dynamic";

/** CSV export of gift transactions — organiser finance access only. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const guard = await requireGiftFinanceAccess(url.searchParams.get("eventId"));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const csv = await giftAdminService.exportCsv(guard.eventId, {
    status: (url.searchParams.get("status") as EventGiftPaymentStatus | "ALL") ?? "ALL",
    giftType: (url.searchParams.get("giftType") as EventGiftType | "ALL") ?? "ALL",
    search: url.searchParams.get("search"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  await createAuditLog({
    userId: guard.userId,
    action: "UPDATE",
    entity: "event_gift_payment",
    entityId: guard.eventId,
    details: { action: "EXPORT_CSV" },
  });

  const filename = `celeventic-gifts-${guard.eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
