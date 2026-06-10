import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrService } from "@/services/qr/qr.service";
import { createAuditLog } from "@/lib/audit";
import { verifyEventAccess } from "@/lib/event-access";

const verifySchema = z.object({
  token: z.string(),
  eventId: z.string().optional(),
  gate: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      data.gate
    );

    await createAuditLog({
      userId: session.user.id,
      action: "QR_SCAN",
      entity: "qr_code",
      details: { result: result.result, token: data.token },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
