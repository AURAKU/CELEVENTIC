import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeEventAny, guardRate } from "@/lib/guest-search/api-auth";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import {
  archiveVendorTeamPass,
  deleteVendorTeamPass,
  getVendorTeamPass,
  updateVendorTeamPass,
} from "@/services/vendor-pass/vendor-team-pass.service";
import {
  resolveVendorPassTypeSelection,
  VendorPassTypeError,
} from "@/services/vendor-pass/vendor-pass-type.service";

export const dynamic = "force-dynamic";

async function authorizePass(passId: string, write: boolean) {
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { id: passId },
    select: { eventId: true },
  });
  if (!pass) {
    return { error: NextResponse.json({ error: "Vendor pass not found" }, { status: 404 }) };
  }
  const auth = await authorizeEventAny(
    pass.eventId,
    write
      ? [EventPermissionKey.MANAGE_VENDOR_ACCESS, EventPermissionKey.MANAGE_GUESTS]
      : [
          EventPermissionKey.MANAGE_VENDOR_ACCESS,
          EventPermissionKey.MANAGE_GUESTS,
          EventPermissionKey.SCAN_QR,
        ],
    write
      ? "You do not have permission to manage vendor passes"
      : "You do not have permission to view vendor passes"
  );
  if (auth.error) return { error: auth.error };
  return { ctx: auth.ctx!, eventId: pass.eventId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizePass(id, false);
  if ("error" in auth && auth.error) return auth.error;
  const pass = await getVendorTeamPass(id, { includeToken: true });
  if (!pass) return NextResponse.json({ error: "Vendor pass not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: pass });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizePass(id, true);
  if ("error" in auth && auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx!.userId, "vendor-pass-patch", 60, 60);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  try {
    const patch = { ...body };
    if (typeof patch.passType === "string" && patch.passType) {
      const selection = await resolveVendorPassTypeSelection({
        eventId: auth.eventId!,
        value: patch.passType,
        categoryLabel: patch.categoryLabel,
      });
      patch.passType = selection.passType;
      patch.categoryLabel = selection.categoryLabel;
    }
    const pass = await updateVendorTeamPass(id, auth.ctx!.userId, patch);
    return NextResponse.json({ success: true, data: pass });
  } catch (error) {
    if (error instanceof VendorPassTypeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorizePass(id, true);
  if ("error" in auth && auth.error) return auth.error;

  const body = z
    .object({ confirm: z.literal(true), archive: z.boolean().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Confirm deletion. Prefer archive when admission history exists." },
      { status: 400 }
    );
  }

  try {
    if (body.data.archive) {
      const pass = await archiveVendorTeamPass(id, auth.ctx!.userId);
      return NextResponse.json({ success: true, data: pass });
    }
    const result = await deleteVendorTeamPass(id, auth.ctx!.userId, true);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 400 }
    );
  }
}
