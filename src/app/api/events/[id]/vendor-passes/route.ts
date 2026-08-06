import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { authorizeEventAny, guardRate } from "@/lib/guest-search/api-auth";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import {
  createVendorTeamPass,
  listVendorTeamPasses,
} from "@/services/vendor-pass/vendor-team-pass.service";
import {
  resolveVendorPassTypeSelection,
  VendorPassTypeError,
} from "@/services/vendor-pass/vendor-pass-type.service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  vendorName: z.string().min(2).max(120),
  passType: z.string().optional(),
  passMode: z.enum(["INDIVIDUAL", "TEAM"]).optional(),
  entryMode: z.enum(["INDIVIDUAL_ENTRY", "ADMIT_FULL_TEAM", "SELECT_QUANTITY"]).optional(),
  contactName: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().max(120).optional().nullable(),
  companyName: z.string().max(120).optional().nullable(),
  categoryLabel: z.string().max(80).optional().nullable(),
  teamCapacity: z.number().int().min(1).max(500).optional(),
  /** Access-card behaviour; omitted means UNLIMITED re-entry. */
  reentryPolicy: z.enum(["NONE", "ONE", "UNLIMITED", "CUSTOM"]).optional(),
  reentryLimit: z.number().int().min(1).max(999).optional().nullable(),
  accessZones: z.array(z.string().min(1).max(60)).max(20).optional(),
  setupAccess: z.boolean().optional(),
  breakdownAccess: z.boolean().optional(),
  equipmentAccess: z.boolean().optional(),
  vehicleRegistration: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  memberNames: z.array(z.string().min(1).max(80)).max(100).optional(),
  codeLength: z.union([z.literal(4), z.literal(6)]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const auth = await authorizeEventAny(
    eventId,
    [
      EventPermissionKey.MANAGE_VENDOR_ACCESS,
      EventPermissionKey.MANAGE_GUESTS,
      EventPermissionKey.SCAN_QR,
    ],
    "You do not have permission to view vendor passes"
  );
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "vendor-passes-list", 120, 60);
  if (limited) return limited;

  const url = new URL(req.url);
  const result = await listVendorTeamPasses({
    eventId,
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status"),
    passType: url.searchParams.get("passType"),
    passMode: url.searchParams.get("passMode"),
    page: Number(url.searchParams.get("page") ?? 1),
    limit: Number(url.searchParams.get("limit") ?? 20),
  });

  return NextResponse.json({ success: true, data: result });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await authorizeEventAny(
    eventId,
    [EventPermissionKey.MANAGE_VENDOR_ACCESS, EventPermissionKey.MANAGE_GUESTS],
    "You do not have permission to create vendor passes"
  );
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "vendor-passes-create", 30, 60);
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    // The picker is per-event, so the selected type is resolved server-side:
    // a stale tab must not mint a pass against a type this event has retired.
    const passTypeSelection = await resolveVendorPassTypeSelection({
      eventId,
      value: parsed.data.passType,
      categoryLabel: parsed.data.categoryLabel,
    });
    const pass = await createVendorTeamPass({
      eventId,
      actorUserId: auth.ctx.userId,
      ...parsed.data,
      passType: passTypeSelection.passType,
      categoryLabel: passTypeSelection.categoryLabel,
    });
    return NextResponse.json({ success: true, data: pass });
  } catch (error) {
    if (error instanceof VendorPassTypeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create vendor pass" },
      { status: 400 }
    );
  }
}
