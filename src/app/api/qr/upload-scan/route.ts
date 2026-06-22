import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrService } from "@/services/qr/qr.service";
import { createAuditLog } from "@/lib/audit";
import { verifyEventAccess } from "@/lib/event-access";
import { rateLimit } from "@/lib/rate-limit";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

const uploadScanSchema = z.object({
  token: z.string().min(1),
  eventId: z.string().min(1),
  gate: z.string().optional(),
  override: z.boolean().optional(),
  typeFilter: z.enum(["all", "guest", "ticket"]).optional(),
});

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function deviceInfo(req: Request) {
  return JSON.stringify({
    ua: req.headers.get("user-agent")?.slice(0, 200) ?? "unknown",
    ip: clientIp(req),
    source: "upload_scan",
  });
}

/** Check-in from uploaded QR image (client decodes image, server validates token) */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`qr-upload-scan:${session.user.id}:${ip}`, 120, 60);
  if (!rl.success) {
    return NextResponse.json({ success: false, status: "unauthorized", error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = uploadScanSchema.parse(body);

    await verifyEventAccess(data.eventId, session.user.id, session.user.role);

    const override = Boolean(data.override) && isAdminRole(session.user.role as UserRole);

    const result = await qrService.checkInQr(
      data.token,
      data.eventId,
      session.user.id,
      data.gate,
      deviceInfo(req),
      override
    );

    if (data.typeFilter === "guest" && !result.guest) {
      return NextResponse.json({
        success: false,
        status: "invalid",
        error: "Not a guest pass",
        data: result,
      });
    }
    if (data.typeFilter === "ticket" && !result.ticket) {
      return NextResponse.json({
        success: false,
        status: "invalid",
        error: "Not a ticket pass",
        data: result,
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "QR_SCAN",
      entity: "qr_code",
      details: { kind: result.status === "valid" ? "checkin" : "scan", status: result.status, eventId: data.eventId, source: "upload_scan" },
    });

    return NextResponse.json({
      success: result.status === "valid" || result.status === "already_checked_in",
      status: result.status,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, status: "invalid", error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, status: "invalid", error: "Scan failed" }, { status: 500 });
  }
}
