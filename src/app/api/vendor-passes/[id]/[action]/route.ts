import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl, parsePaginationInput } from "@/lib/pagination";
import { authorizeEventAny, guardRate } from "@/lib/guest-search/api-auth";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import {
  admitVendorTeamPass,
  getVendorTeamPassHistory,
  reactivateVendorTeamPass,
  regenerateVendorTeamPass,
  revokeVendorTeamPass,
} from "@/services/vendor-pass/vendor-team-pass.service";

export const dynamic = "force-dynamic";

async function authorizeWrite(passId: string) {
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { id: passId },
    select: { eventId: true },
  });
  if (!pass) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const auth = await authorizeEventAny(
    pass.eventId,
    [EventPermissionKey.MANAGE_VENDOR_ACCESS, EventPermissionKey.MANAGE_GUESTS],
    "You do not have permission to manage vendor passes"
  );
  if (auth.error) return { error: auth.error };
  return { ctx: auth.ctx!, eventId: pass.eventId };
}

async function authorizeScan(passId: string) {
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { id: passId },
    select: { eventId: true },
  });
  if (!pass) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const auth = await authorizeEventAny(
    pass.eventId,
    [EventPermissionKey.SCAN_QR, EventPermissionKey.MANAGE_VENDOR_ACCESS],
    "You do not have scan permission"
  );
  if (auth.error) return { error: auth.error };
  return { ctx: auth.ctx!, eventId: pass.eventId };
}

/** Entry logs are host-facing: guest managers read them without scan rights. */
async function authorizeHistoryRead(passId: string) {
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { id: passId },
    select: { eventId: true },
  });
  if (!pass) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const auth = await authorizeEventAny(
    pass.eventId,
    [
      EventPermissionKey.MANAGE_VENDOR_ACCESS,
      EventPermissionKey.MANAGE_GUESTS,
      EventPermissionKey.SCAN_QR,
    ],
    "You do not have permission to view vendor entry logs"
  );
  if (auth.error) return { error: auth.error };
  return { ctx: auth.ctx!, eventId: pass.eventId };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;
  const body = await req.json().catch(() => ({}));

  if (action === "regenerate") {
    const auth = await authorizeWrite(id);
    if ("error" in auth && auth.error) return auth.error;
    const limited = await guardRate(req, auth.ctx!.userId, "vendor-pass-regen", 20, 60);
    if (limited) return limited;
    const parsed = z
      .object({
        target: z.enum(["qr", "code", "both"]),
        reason: z.string().min(3).max(500),
        confirm: z.literal(true),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Regeneration requires confirmation." }, { status: 400 });
    }
    try {
      const pass = await regenerateVendorTeamPass(
        id,
        auth.ctx!.userId,
        parsed.data.target,
        parsed.data.reason,
        true
      );
      return NextResponse.json({ success: true, data: pass });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Regenerate failed" },
        { status: 400 }
      );
    }
  }

  if (action === "revoke") {
    const auth = await authorizeWrite(id);
    if ("error" in auth && auth.error) return auth.error;
    const pass = await revokeVendorTeamPass(id, auth.ctx!.userId, body?.reason);
    return NextResponse.json({ success: true, data: pass });
  }

  if (action === "reactivate") {
    const auth = await authorizeWrite(id);
    if ("error" in auth && auth.error) return auth.error;
    const pass = await reactivateVendorTeamPass(id, auth.ctx!.userId);
    return NextResponse.json({ success: true, data: pass });
  }

  if (action === "admit" || action === "admit-quantity" || action === "admit-team") {
    const auth = await authorizeScan(id);
    if ("error" in auth && auth.error) return auth.error;
    const limited = await guardRate(req, auth.ctx!.userId, "vendor-pass-admit", 120, 60);
    if (limited) return limited;

    const mode =
      action === "admit-team" ? "full_team" : action === "admit-quantity" ? "quantity" : "one";
    const result = await admitVendorTeamPass({
      eventId: auth.eventId!,
      passId: id,
      mode,
      quantity: typeof body?.quantity === "number" ? body.quantity : undefined,
      scannerUserId: auth.ctx!.userId,
      gate: typeof body?.gate === "string" ? body.gate : null,
      deviceInfo: typeof body?.deviceInfo === "string" ? body.deviceInfo : null,
      dryRun: Boolean(body?.dryRun),
      clientRecordId: typeof body?.clientRecordId === "string" ? body.clientRecordId : null,
      channel: "dashboard",
    });
    if (!result.found) return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error, data: result.pass }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: result });
  }

  if (action === "history") {
    const auth = await authorizeHistoryRead(id);
    if ("error" in auth && auth.error) return auth.error;
    const { page, limit } = parsePaginationInput({
      page: body?.page,
      limit: body?.limit ?? 50,
    });
    const data = await getVendorTeamPassHistory(id, { page, limit });
    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 404 });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;
  if (action !== "history") {
    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }
  const auth = await authorizeHistoryRead(id);
  if ("error" in auth && auth.error) return auth.error;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: 20 });
  const data = await getVendorTeamPassHistory(id, { page, limit });
  return NextResponse.json({ success: true, data });
}
