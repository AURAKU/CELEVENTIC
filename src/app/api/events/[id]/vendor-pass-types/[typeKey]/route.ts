import { NextResponse } from "next/server";
import { authorizeEventAny, guardRate } from "@/lib/guest-search/api-auth";
import {
  deleteEventVendorPassType,
  VendorPassTypeError,
  VENDOR_PASS_TYPE_WRITE_PERMISSIONS,
} from "@/services/vendor-pass/vendor-pass-type.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; typeKey: string }> }
) {
  const { id: eventId, typeKey } = await params;
  const auth = await authorizeEventAny(
    eventId,
    [...VENDOR_PASS_TYPE_WRITE_PERMISSIONS],
    "You do not have permission to manage vendor pass types"
  );
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "vendor-pass-types-delete", 30, 60);
  if (limited) return limited;

  const confirm = new URL(req.url).searchParams.get("confirm") === "1";

  try {
    const result = await deleteEventVendorPassType({
      eventId,
      actorUserId: auth.ctx.userId,
      key: decodeURIComponent(typeKey),
      confirm,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof VendorPassTypeError) {
      return NextResponse.json(
        { error: error.message, requiresConfirmation: error.requiresConfirmation },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Could not remove pass type" }, { status: 400 });
  }
}
