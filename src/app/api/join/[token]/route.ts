import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import {
  GeneralPassRegistrationError,
  getRegistrationPage,
  registerForGeneralPass,
} from "@/services/guest-import/general-pass.service";

/**
 * Public open-registration endpoint (General Pass Method B).
 *
 * Unauthenticated by design, the whole point is that a guest with the link
 * can claim a pass. The safety comes from elsewhere: an unguessable 24-byte
 * token, a per-IP ceiling and a batch-wide cap in the service, and an IP rate
 * limit here so the endpoint cannot be hammered to enumerate tokens.
 *
 * Crucially, the link is *not* the pass. Every registration mints a distinct
 * invitation with its own signed QR and admission code, so forwarding the link
 * multiplies passes rather than sharing one.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().max(200).optional(),
  contact: z.string().trim().max(200).optional(),
});

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const page = await getRegistrationPage(token);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: page });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = clientIp(req);

  // Two limits: a tight one per token+IP for the claim itself, and a looser
  // per-IP one so a bot cannot sweep tokens across many batches.
  const perToken = await rateLimit(`join:${token}:${ip}`, 5, 300);
  const perIp = await rateLimit(`join-ip:${ip}`, 30, 300);
  if (!perToken.success || !perIp.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    const result = await registerForGeneralPass({
      token,
      name: body.name,
      contact: body.contact,
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof GeneralPassRegistrationError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "RATE_LIMITED" ? 429 : 409;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not issue your pass. Please try again." }, { status: 500 });
  }
}
