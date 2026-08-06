import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBatch, errorResponse } from "@/lib/guest-import/api-auth";
import { maybeKickGuestImportBatch } from "@/lib/guest-import/inline-kick";
import { guestImportService } from "@/services/guest-import/guest-import.service";
import { importOptionsSchema } from "@/lib/guest-import/options-schema";
import { ImportField, type ColumnMapping, type ImportOptions } from "@/lib/guest-import/types";

/** Read, re-map or discard a staged import. */

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  mapping: z.record(z.string(), z.enum(Object.values(ImportField) as [string, ...string[]])).optional(),
  options: importOptionsSchema.optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  const progress = await guestImportService.getProgress(batchId);
  if (!progress) return NextResponse.json({ error: "Import not found" }, { status: 404 });

  // Self-heal when the jobs worker isn't running, fire-and-forget so this
  // poll stays fast; the next poll picks up freshly generated rows.
  if (!progress.finished) {
    void maybeKickGuestImportBatch(batchId);
  }

  return NextResponse.json({ success: true, data: progress });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  try {
    const body = patchSchema.parse(await req.json());
    const mapping = body.mapping
      ? (Object.fromEntries(
          Object.entries(body.mapping).map(([index, field]) => [Number(index), field])
        ) as ColumnMapping)
      : undefined;

    // Rows are only re-derived when the change actually changes how they parse,
    // so saving a message or a tag never discards the organiser's review.
    const preview = await guestImportService.applyBatchPatch(batchId, auth.ctx.userId, {
      mapping,
      options: body.options as Partial<ImportOptions>,
    });
    return NextResponse.json({ success: true, data: preview });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  try {
    await guestImportService.discardDraft(batchId, auth.ctx.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
