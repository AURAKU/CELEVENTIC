import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { redeemProximityShareToken } from "@/services/digital-business-card/proximity.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(16).max(80),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-tap-exchange:${session.user.id}`, 12, 300);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many share attempts." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Missing share token" }, { status: 400 });
  try {
    const share = await redeemProximityShareToken({
      userId: session.user.id,
      token: parsed.data.token,
      ip,
    });
    return NextResponse.json({ success: true, data: share });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Share could not be verified";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
