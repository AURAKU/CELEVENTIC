import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePlatformAccounts } from "@/lib/auth/ensure-platform-accounts";

/**
 * One-time / maintenance bootstrap for live environments without shell access.
 * POST with header `x-setup-secret: <SETUP_SECRET>` or body `{ "secret": "..." }`.
 */
export async function POST(req: Request) {
  const expected = process.env.SETUP_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not configured on this server" },
      { status: 503 }
    );
  }

  let provided = req.headers.get("x-setup-secret")?.trim() ?? "";
  if (!provided) {
    try {
      const body = (await req.json()) as { secret?: string };
      provided = body.secret?.trim() ?? "";
    } catch {
      /* no JSON body */
    }
  }

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Invalid setup secret" }, { status: 401 });
  }

  const results = await ensurePlatformAccounts(prisma);
  return NextResponse.json({
    success: true,
    accounts: results.map((r) => ({
      email: r.email,
      role: r.role,
      created: r.created,
      passwordReset: r.passwordReset,
    })),
  });
}
