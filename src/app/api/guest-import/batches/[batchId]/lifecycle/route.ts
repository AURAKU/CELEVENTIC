import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBatch, errorResponse, guardRate } from "@/lib/guest-import/api-auth";
import {
  archiveImportBatch,
  countAdmittedFromBatch,
  restoreImportBatch,
  rollbackImportBatch,
  RollbackBlockedError,
} from "@/services/guest-import/rollback.service";

/**
 * Undo controls for a generated import: rollback, archive, restore.
 *
 * GET reports whether rollback is still safe, so the UI can offer archive
 * instead of letting an organiser discover the refusal after typing a reason.
 */

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["rollback", "archive", "restore"]),
  reason: z.string().trim().max(300).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  const admitted = await countAdmittedFromBatch(batchId);
  return NextResponse.json({
    success: true,
    data: {
      admitted,
      canRollback: admitted === 0,
      reason:
        admitted > 0
          ? `${admitted} guest${admitted === 1 ? " has" : "s have"} already been admitted. Archive keeps the admission record; rollback would erase it.`
          : null,
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, `lifecycle:${batchId}`, 10, 60);
  if (limited) return limited;

  try {
    const body = schema.parse(await req.json());
    const reason = body.reason?.trim() || "Organiser requested";

    if (body.action === "rollback") {
      const result = await rollbackImportBatch(batchId, auth.ctx.userId, reason);
      return NextResponse.json({ success: true, data: result });
    }
    if (body.action === "archive") {
      const result = await archiveImportBatch(batchId, auth.ctx.userId, reason);
      return NextResponse.json({ success: true, data: result });
    }
    const result = await restoreImportBatch(batchId, auth.ctx.userId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof RollbackBlockedError) {
      return NextResponse.json(
        { error: error.message, admitted: error.admittedCount, suggestArchive: true },
        { status: 409 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
