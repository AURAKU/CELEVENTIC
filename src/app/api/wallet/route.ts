import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { walletService } from "@/services/wallet/wallet.service";
import { verifyEventAccess } from "@/lib/event-access";
import { createAuditLog } from "@/lib/audit";

const expenseSchema = z.object({
  eventId: z.string(),
  category: z.string(),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const summary = await walletService.getWalletSummary(eventId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = expenseSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    await walletService.recordExpense(data.eventId, data.category, data.amount, data.description, session.user.id);
    await createAuditLog({
      userId: session.user.id,
      action: "PAYMENT",
      entity: "wallet",
      entityId: data.eventId,
      details: { type: "expense", category: data.category, amount: data.amount },
    });
    const summary = await walletService.getWalletSummary(data.eventId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Wallet operation failed" }, { status: 500 });
  }
}
