import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { walletService } from "@/services/wallet/wallet.service";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { createAuditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role as UserRole,
      EventPermissionKey.MANAGE_FINANCES
    );
    const csv = await walletService.exportTransactionsCsv(eventId);
    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT",
      entity: "wallet_export",
      entityId: eventId,
    });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="wallet-${eventId}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}
