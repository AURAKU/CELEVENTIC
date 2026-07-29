import { NextResponse } from "next/server";
import { giftReceiptService } from "@/services/gifts/gift-receipt.service";
import { assertNoPrivateGiftData } from "@/lib/gifts/gift-privacy";
import { giftThemeToCssVars } from "@/lib/gifts/gift-theme";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Signed receipt lookup, the one way an unauthenticated guest can retrieve
 * proof of their gift. The token is an HMAC over the receipt id, so a bad
 * signature is rejected before any database work happens.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = await rateLimit(`gift-receipt:${ip}`, 60, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const receipt = await giftReceiptService.resolveByToken(token);
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const payload = {
    receipt: receipt.snapshot,
    theme: receipt.theme,
    themeVars: giftThemeToCssVars(receipt.theme),
    status: receipt.status,
  };

  assertNoPrivateGiftData(payload, "giftReceipt");

  return NextResponse.json(
    { success: true, data: payload },
    { headers: { "Cache-Control": "no-store" } }
  );
}
