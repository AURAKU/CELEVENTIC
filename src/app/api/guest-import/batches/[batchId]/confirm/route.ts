import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBatch, errorResponse, guardRate } from "@/lib/guest-import/api-auth";
import { maybeKickGuestImportBatch } from "@/lib/guest-import/inline-kick";
import { guestImportService } from "@/services/guest-import/guest-import.service";

/**
 * The point of no return: hand a reviewed batch to the background worker.
 *
 * Rate-limited hard — a double-clicked confirm must not queue two generation
 * runs for the same list. When the worker isn't running, we also kick inline
 * generation immediately so Create & send never sits at "0 of N" forever.
 */

export const dynamic = "force-dynamic";

const schema = z.object({ allowUnreviewedDuplicates: z.boolean().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, `confirm:${batchId}`, 5, 60);
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await guestImportService.confirmBatch(batchId, auth.ctx.userId, body);
    // Start work immediately when no dedicated worker is alive.
    void maybeKickGuestImportBatch(batchId);
    return NextResponse.json({ success: true, data: result }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error, 409);
  }
}
