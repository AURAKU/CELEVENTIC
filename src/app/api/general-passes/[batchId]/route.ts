import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeGeneralBatch, errorResponse, guardRate } from "@/lib/guest-import/api-auth";
import {
  closeGeneralPassBatch,
  listGeneralPasses,
  mintGeneralPassChunk,
  revokeGeneralPassBatch,
} from "@/services/guest-import/general-pass.service";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { toCsv } from "@/lib/guest-import/csv-safety";

/** Issued passes for one batch, plus close / revoke / retry controls. */

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["close", "revoke", "retry"]),
  reason: z.string().trim().max(300).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeGeneralBatch(batchId);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: 50, maxLimit: 200 });
  const data = await listGeneralPasses(batchId, { page, limit });

  // Print/hand-out export. Codes are quoted and formula-guarded like every
  // other download, so "=..." can never survive into a spreadsheet.
  if (url.searchParams.get("format") === "csv") {
    const rows = [
      ["Pass", "Admission code", "Party size", "Admitted", "Status", "Link"],
      ...data.items.map((p) => [
        p.name,
        p.code ?? "",
        p.partySize,
        p.admittedCount,
        p.status ?? "",
        p.inviteUrl,
      ]),
    ];
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="general-passes-${batchId.slice(0, 8)}-page-${page}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeGeneralBatch(batchId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, `general-pass-action:${batchId}`, 15, 60);
  if (limited) return limited;

  try {
    const body = actionSchema.parse(await req.json());

    if (body.action === "close") {
      const batch = await closeGeneralPassBatch(batchId, auth.ctx.userId);
      return NextResponse.json({
        success: true,
        data: { ...batch, registrationToken: undefined },
      });
    }

    if (body.action === "revoke") {
      const result = await revokeGeneralPassBatch(
        batchId,
        auth.ctx.userId,
        body.reason?.trim() || "Passes revoked by organiser"
      );
      return NextResponse.json({ success: true, data: result });
    }

    const result = await mintGeneralPassChunk(batchId);
    return NextResponse.json({ success: true, data: result }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
