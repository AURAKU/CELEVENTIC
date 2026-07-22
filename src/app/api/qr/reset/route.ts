import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { qrService } from "@/services/qr/qr.service";
import { verifyEventAccess } from "@/lib/event-access";
import { rateLimit } from "@/lib/rate-limit";

const resetSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("guest"),
    eventId: z.string().min(1),
    guestId: z.string().min(1),
  }),
  z.object({
    scope: z.literal("event"),
    eventId: z.string().min(1),
  }),
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`qr-reset:${session.user.id}:${ip}`, 30, 60);
  if (!rl.success) {
    return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = resetSchema.parse(body);

    await verifyEventAccess(data.eventId, session.user.id, session.user.role);

    if (data.scope === "guest") {
      const result = await qrService.resetGuestAdmission(data.eventId, data.guestId, session.user.id);
      return NextResponse.json({ success: true, data: result });
    }

    const result = await qrService.resetEventAdmissions(data.eventId, session.user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
