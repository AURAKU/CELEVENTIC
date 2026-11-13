import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { getTapGuestLanding } from "@/services/digital-business-card/proximity.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-tap-guest:${ip}`, 40, 300);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  const code = req.nextUrl.searchParams.get("code") || "";
  const landing = await getTapGuestLanding(code, { recordOpen: true });
  if (landing.status !== 200) {
    return NextResponse.json({ error: landing.error }, { status: landing.status });
  }
  return NextResponse.json({ success: true, data: landing.data });
}
