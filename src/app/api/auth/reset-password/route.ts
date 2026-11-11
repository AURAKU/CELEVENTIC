import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PASSWORD_RESET_MIN_LENGTH } from "@/lib/auth/password-reset";
import { requestClientIp } from "@/lib/http/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { consumePasswordReset } from "@/services/auth/password-reset.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(16).max(200),
  password: z.string().min(PASSWORD_RESET_MIN_LENGTH).max(200),
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
    return NextResponse.json(
      { error: `Password must be at least ${PASSWORD_RESET_MIN_LENGTH} characters` },
      { status: 400 }
    );
  }

  const ip = requestClientIp(req);
  const limited = await rateLimit(`password-reset-consume:${ip}`, 20, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many reset attempts. Try again later." }, { status: 429 });
  }

  const result = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
