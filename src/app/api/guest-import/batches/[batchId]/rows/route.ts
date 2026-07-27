import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBatch, errorResponse } from "@/lib/guest-import/api-auth";
import { guestImportService } from "@/services/guest-import/guest-import.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

/** Paginated preview rows, per-row edits, and bulk decisions. */

export const dynamic = "force-dynamic";

const PARTY_TYPES = ["INDIVIDUAL", "COUPLE", "PLUS_GUEST", "FAMILY", "GROUP"] as const;
const DECISIONS = ["CREATE", "SKIP", "MERGE_INTO_EXISTING", "UPDATE_EXISTING"] as const;

const rowUpdateSchema = z.object({
  rowId: z.string().min(1),
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  partyType: z.enum(PARTY_TYPES).optional(),
  partySize: z.number().int().min(1).max(200).optional(),
  groupName: z.string().trim().max(120).nullable().optional(),
  tableNumber: z.string().trim().max(40).nullable().optional(),
  seatLabel: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  decision: z.enum(DECISIONS).optional(),
  status: z.enum(["READY", "NEEDS_REVIEW", "SKIPPED"]).optional(),
});

const patchSchema = z.object({ updates: z.array(rowUpdateSchema).min(1).max(500) });

const bulkSchema = z.object({
  status: z.enum(["READY", "NEEDS_REVIEW", "DUPLICATE", "INVALID", "SKIPPED"]).optional(),
  decision: z.enum(DECISIONS),
  partySize: z.number().int().min(1).max(200).optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: 50, maxLimit: 200 });
  const data = await guestImportService.listRows(batchId, {
    page,
    limit,
    status: url.searchParams.get("status") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  try {
    const body = patchSchema.parse(await req.json());
    const result = await guestImportService.updateRows(batchId, auth.ctx.userId, body.updates);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const auth = await authorizeBatch(batchId);
  if (auth.error) return auth.error;

  try {
    const body = bulkSchema.parse(await req.json());
    const result = await guestImportService.bulkDecision(batchId, auth.ctx.userId, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
