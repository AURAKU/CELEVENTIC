import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveEventAccess } from "@/lib/workspace/event-access";
import { sharedVendorAccessService } from "@/services/qr-hub/shared-vendor-access.service";
import { looksLikeVendorToken } from "@/lib/qr-hub/vendor-token";

export const dynamic = "force-dynamic";

/** Gate scanner: verify shared vendor access (reusable, never admits guests). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const token = typeof body?.token === "string" ? body.token : null;
  const code = typeof body?.code === "string" ? body.code : null;

  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  if (!token && !code) {
    return NextResponse.json({ error: "token or code is required" }, { status: 400 });
  }
  if (token && !looksLikeVendorToken(token) && !code) {
    // Allow non-cvs tokens to fall through to guest admission elsewhere.
    return NextResponse.json({ error: "Not a vendor access token", notVendor: true }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to scan" }, { status: 401 });
  }
  const access = await resolveEventAccess(eventId, session.user.id, session.user.role);
  if (!access || !access.permissions.has("SCAN_QR")) {
    return NextResponse.json({ error: "You do not have scan permission" }, { status: 403 });
  }

  const result = await sharedVendorAccessService.verifyAndScan({
    eventId,
    token,
    code,
    scannedById: session.user.id,
    gate: typeof body?.gate === "string" ? body.gate : null,
    deviceInfo: typeof body?.deviceInfo === "string" ? body.deviceInfo : null,
    operatorRoleNote: typeof body?.operatorRoleNote === "string" ? body.operatorRoleNote : null,
    vendorLabel: typeof body?.vendorLabel === "string" ? body.vendorLabel : null,
    offline: Boolean(body?.offline),
    clientRecordId: typeof body?.clientRecordId === "string" ? body.clientRecordId : null,
  });

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      // Explicit privacy / admission guarantees for the gate UI.
      guestAdmissionIncremented: false,
      companionUnlocked: false,
      reusable: true,
    },
  });
}
