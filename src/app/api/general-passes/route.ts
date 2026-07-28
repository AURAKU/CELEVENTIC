import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeEvent, errorResponse, guardRate } from "@/lib/guest-import/api-auth";
import { maybeKickGeneralPassBatch } from "@/lib/guest-import/inline-kick";
import {
  createGeneralPassBatch,
  listGeneralPassBatches,
  registrationUrl,
} from "@/services/guest-import/general-pass.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

/** Create and list general-admission pass batches (Methods A and B). */

export const dynamic = "force-dynamic";

const createSchema = z.object({
  eventId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
  method: z.enum(["FIXED_QUANTITY", "OPEN_REGISTRATION"]),
  quantity: z.number().int().min(1).max(5000).optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  maxRegistrations: z.number().int().min(1).max(50000).nullable().optional(),
  requireName: z.boolean().optional(),
  requireContact: z.boolean().optional(),
  closesAt: z.string().datetime().nullable().optional(),
  passLabelPrefix: z.string().trim().max(40).optional(),
  welcomeMessage: z.string().trim().max(1000).nullable().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const auth = await authorizeEvent(eventId);
  if (auth.error) return auth.error;

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await listGeneralPassBatches(eventId, { page, limit });

  // Resume any fixed-quantity batches stuck GENERATING without a worker.
  for (const batch of data.items) {
    if (batch.method === "FIXED_QUANTITY" && batch.status === "GENERATING") {
      void maybeKickGeneralPassBatch(batch.id);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      items: data.items.map((batch) => ({
        ...batch,
        registrationUrl: batch.registrationToken ? registrationUrl(batch.registrationToken) : null,
        // The token itself never leaves the server in a list response.
        registrationToken: undefined,
      })),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());

    const auth = await authorizeEvent(body.eventId);
    if (auth.error) return auth.error;

    const limited = await guardRate(req, auth.ctx.userId, "general-pass", 10, 60);
    if (limited) return limited;

    const batch = await createGeneralPassBatch({
      eventId: body.eventId,
      userId: auth.ctx.userId,
      label: body.label,
      method: body.method,
      quantity: body.quantity,
      partySize: body.partySize,
      maxRegistrations: body.maxRegistrations ?? null,
      requireName: body.requireName,
      requireContact: body.requireContact,
      closesAt: body.closesAt ? new Date(body.closesAt) : null,
      passLabelPrefix: body.passLabelPrefix,
      welcomeMessage: body.welcomeMessage ?? null,
    });

    if (batch.method === "FIXED_QUANTITY") {
      void maybeKickGeneralPassBatch(batch.id);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...batch,
          registrationToken: undefined,
          registrationUrl: batch.registrationToken ? registrationUrl(batch.registrationToken) : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
