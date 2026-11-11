import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { joinProximitySession } from "@/services/digital-business-card/proximity.service";

export const dynamic = "force-dynamic";

const joinSchema = z.object({
  cardId: z.string().min(8).max(40),
  joinCode: z.string().min(4).max(12),
  transport: z.enum(["qr", "code", "ble", "nfc-card"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = requestClientIp(req);
  const perUser = await rateLimit(`celecard-tap-join:${session.user.id}`, 10, 300);
  const perIp = await rateLimit(`celecard-tap-join-ip:${ip}`, 20, 300);
  if (!perUser.success || !perIp.success) {
    return NextResponse.json({ error: "Too many join attempts. Wait a moment." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter the code from the other phone." }, { status: 400 });
  try {
    const view = await joinProximitySession({
      userId: session.user.id,
      cardId: parsed.data.cardId,
      joinCode: parsed.data.joinCode,
      transport: parsed.data.transport,
      ip,
    });
    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join Tap Mode";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
