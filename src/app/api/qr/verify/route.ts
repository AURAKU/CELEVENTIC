import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrService } from "@/services/qr/qr.service";
import { createAuditLog } from "@/lib/audit";
import { verifyEventAccess } from "@/lib/event-access";
import { rateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  token: z.string().min(1),
  eventId: z.string().optional(),
  gate: z.string().optional(),
});

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function deviceInfo(req: Request) {
  return JSON.stringify({
    ua: req.headers.get("user-agent")?.slice(0, 200) ?? "unknown",
    ip: clientIp(req),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`qr-verify:${session.user.id}:${ip}`, 60, 60);
  if (!rl.success) {
    return NextResponse.json({ success: false, status: "unauthorized", error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = verifySchema.parse(body);

    if (data.eventId) {
      await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    }

    const result = await qrService.verifyQr(
      data.token,
      data.eventId,
      session.user.id,
      data.gate,
      deviceInfo(req)
    );

    if (result.status === "invalid" || result.status === "not_found") {
      await createAuditLog({
        userId: session.user.id,
        action: "QR_SCAN",
        entity: "qr_code",
        details: { kind: "invalid", status: result.status, eventId: data.eventId },
      });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, status: "invalid", error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, status: "invalid", error: "Verification failed" }, { status: 500 });
  }
}
