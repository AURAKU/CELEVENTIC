import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeEventAny, guardRate } from "@/lib/guest-search/api-auth";
import {
  createEventVendorPassType,
  listEventVendorPassTypes,
  VendorPassTypeError,
  VENDOR_PASS_TYPE_READ_PERMISSIONS,
  VENDOR_PASS_TYPE_WRITE_PERMISSIONS,
} from "@/services/vendor-pass/vendor-pass-type.service";

export const dynamic = "force-dynamic";

const createSchema = z
  .object({
    label: z.string().min(2).max(60).optional(),
    /** Restore a built-in this event hid earlier. */
    key: z.string().min(2).max(60).optional(),
  })
  .refine((value) => Boolean(value.label || value.key), {
    message: "Enter a pass type name.",
  });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const auth = await authorizeEventAny(
    eventId,
    [...VENDOR_PASS_TYPE_READ_PERMISSIONS],
    "You do not have permission to view vendor passes"
  );
  if (auth.error) return auth.error;

  const data = await listEventVendorPassTypes(eventId);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const auth = await authorizeEventAny(
    eventId,
    [...VENDOR_PASS_TYPE_WRITE_PERMISSIONS],
    "You do not have permission to manage vendor pass types"
  );
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "vendor-pass-types-create", 30, 60);
  if (limited) return limited;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Enter a pass type name." },
      { status: 400 }
    );
  }

  try {
    const created = await createEventVendorPassType({
      eventId,
      actorUserId: auth.ctx.userId,
      label: parsed.data.label ?? null,
      key: parsed.data.key ?? null,
    });
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    if (error instanceof VendorPassTypeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not add pass type" }, { status: 400 });
  }
}
