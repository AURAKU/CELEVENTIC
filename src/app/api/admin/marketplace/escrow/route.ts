import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { marketplaceEscrowService } from "@/services/marketplace/marketplace-escrow.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { page, limit } = parsePaginationFromUrl(req.url);
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const data = await marketplaceEscrowService.listHolds({
    status: status as never,
    page,
    limit,
  });
  return NextResponse.json({ success: true, data });
}

const patchSchema = z.object({
  holdId: z.string(),
  action: z.enum(["freeze", "release"]),
  reason: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = patchSchema.parse(await req.json());
    if (body.action === "freeze") {
      const hold = await marketplaceEscrowService.adminFreezeHold(
        body.holdId,
        session.user.id,
        body.reason ?? "Admin freeze"
      );
      return NextResponse.json({ success: true, data: hold });
    }
    const payout = await marketplaceEscrowService.adminReleaseHold(
      body.holdId,
      session.user.id,
      body.reason
    );
    return NextResponse.json({ success: true, data: payout });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Escrow action failed" },
      { status: 400 }
    );
  }
}
