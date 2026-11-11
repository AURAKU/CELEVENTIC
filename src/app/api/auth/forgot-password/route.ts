import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerAppUrl } from "@/lib/app-url";
import { PASSWORD_RESET_PUBLIC_MESSAGE } from "@/lib/auth/password-reset";
import { requestClientIp } from "@/lib/http/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/services/auth/password-reset.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email().max(200),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const ip = requestClientIp(req);
  const emailKey = parsed.data.email.trim().toLowerCase();
  const perEmail = await rateLimit(`password-reset:${emailKey}`, 5, 3600);
  const perIp = await rateLimit(`password-reset-ip:${ip}`, 10, 3600);
  if (!perEmail.success || !perIp.success) {
    return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429 });
  }

  const origin = await getServerAppUrl();
  await requestPasswordReset(parsed.data.email, origin);
  return NextResponse.json({ ok: true, message: PASSWORD_RESET_PUBLIC_MESSAGE });
}
