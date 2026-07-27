import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBatch, errorResponse, guardRate } from "@/lib/guest-import/api-auth";
import {
  cancelBatchDelivery,
  listDeliveries,
  previewDelivery,
  startBatchDelivery,
} from "@/services/guest-import/delivery.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

/**
 * Delivery for a generated batch.
 *
 * Sending is gated on MESSAGE_GUESTS separately from MANAGE_GUESTS: building a
 * guest list and messaging thousands of people are different privileges.
 */

export const dynamic = "force-dynamic";

const postSchema = z.object({
  action: z.enum(["send", "cancel"]).default("send"),
  channels: z.array(z.enum(["EMAIL", "SMS", "WHATSAPP"])).min(1).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  if (url.searchParams.get("preview") === "1") {
    const data = await previewDelivery(batchId);
    return NextResponse.json({ success: true, data });
  }

  const { page, limit } = parsePaginationFromUrl(req.url, { limit: 50, maxLimit: 200 });
  const data = await listDeliveries(batchId, {
    page,
    limit,
    status: url.searchParams.get("status") ?? undefined,
  });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId, "MESSAGE_GUESTS");
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, `delivery:${batchId}`, 10, 60);
  if (limited) return limited;

  try {
    const body = postSchema.parse(await req.json());

    if (body.action === "cancel") {
      const result = await cancelBatchDelivery(batchId, auth.ctx.userId);
      return NextResponse.json({ success: true, data: result });
    }

    if (!body.channels?.length) {
      return NextResponse.json({ error: "Choose at least one channel." }, { status: 400 });
    }

    const result = await startBatchDelivery(batchId, auth.ctx.userId, body.channels);
    return NextResponse.json({ success: true, data: result }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
