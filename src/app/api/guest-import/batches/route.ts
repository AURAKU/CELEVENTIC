import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeEvent, errorResponse, guardRate } from "@/lib/guest-import/api-auth";
import { guestImportService } from "@/services/guest-import/guest-import.service";
import {
  ImportParseError,
  parseManualRows,
  parsePastedText,
  parseUploadedFile,
} from "@/lib/guest-import/parse-source";
import { MAX_IMPORT_FILE_BYTES, type ImportOptions } from "@/lib/guest-import/types";
import { parsePaginationFromUrl } from "@/lib/pagination";

/**
 * Stage a guest list for review, or list previous imports.
 *
 * POST accepts all four input methods behind one endpoint — an uploaded
 * CSV/XLSX (multipart), pasted text (one name per line or a spreadsheet copy),
 * and manually-typed rows — because they all converge on the same reviewable
 * batch. Nothing guest-facing is created here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const optionsSchema = z
  .object({
    templateId: z.string().nullable().optional(),
    message: z.string().max(2000).nullable().optional(),
    defaultPartySize: z.number().int().min(1).max(50).optional(),
    maxPartySize: z.number().int().min(1).max(200).optional(),
    issueEntryPass: z.boolean().optional(),
    enablePlaceCard: z.boolean().optional(),
    applySeating: z.boolean().optional(),
    seatingPlanId: z.string().nullable().optional(),
    normalizeGhanaPhones: z.boolean().optional(),
    validateEmails: z.boolean().optional(),
    publishImmediately: z.boolean().optional(),
    deliveryChannels: z.array(z.enum(["EMAIL", "SMS", "WHATSAPP"])).optional(),
    duplicatePolicy: z.enum(["REVIEW", "SKIP", "CREATE_ANYWAY"]).optional(),
  })
  .partial();

const jsonBodySchema = z.object({
  eventId: z.string().min(1),
  label: z.string().max(120).optional(),
  text: z.string().max(2_000_000).optional(),
  rows: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        partySize: z.union([z.number(), z.string()]).optional(),
        notes: z.string().optional(),
      })
    )
    .max(5000)
    .optional(),
  options: optionsSchema.optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const auth = await authorizeEvent(eventId);
  if (auth.error) return auth.error;

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await guestImportService.listBatches(eventId, { page, limit });
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      return await handleUpload(req);
    }
    return await handleJson(req);
  } catch (error) {
    if (error instanceof ImportParseError) return errorResponse(error, 400);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error, 500);
  }
}

async function handleUpload(req: Request) {
  const form = await req.formData();
  const eventId = String(form.get("eventId") ?? "");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const auth = await authorizeEvent(eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "parse", 20, 60);
  if (limited) return limited;

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a .csv or .xlsx guest list." }, { status: 400 });
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)}MB.` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseUploadedFile(buffer, file.name);

  const rawOptions = form.get("options");
  const options = rawOptions
    ? (optionsSchema.parse(JSON.parse(String(rawOptions))) as Partial<ImportOptions>)
    : undefined;

  const preview = await guestImportService.createBatch({
    eventId,
    userId: auth.ctx.userId,
    source: parsed.source,
    table: parsed,
    fileName: file.name,
    label: String(form.get("label") ?? "") || null,
    options,
  });

  return NextResponse.json(
    { success: true, data: { ...preview, truncated: parsed.truncated } },
    { status: 201 }
  );
}

async function handleJson(req: Request) {
  const body = jsonBodySchema.parse(await req.json());

  const auth = await authorizeEvent(body.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "parse", 20, 60);
  if (limited) return limited;

  const parsed = body.rows?.length
    ? parseManualRows(body.rows)
    : body.text?.trim()
      ? parsePastedText(body.text)
      : null;

  if (!parsed) {
    return NextResponse.json(
      { error: "Paste some names, add a row, or upload a file." },
      { status: 400 }
    );
  }

  const preview = await guestImportService.createBatch({
    eventId: body.eventId,
    userId: auth.ctx.userId,
    source: parsed.source,
    table: parsed,
    label: body.label ?? null,
    options: body.options as Partial<ImportOptions> | undefined,
  });

  return NextResponse.json(
    { success: true, data: { ...preview, truncated: parsed.truncated } },
    { status: 201 }
  );
}
