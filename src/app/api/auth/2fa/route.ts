import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { twoFactorService } from "@/services/auth/two-factor.service";
import { rateLimit } from "@/lib/rate-limit";

const tokenSchema = z.object({ token: z.string().length(6) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit(`2fa:${session.user.id}`, 10, 300);
  if (!limit.success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  try {
    const body = await req.json();

    switch (body.action) {
      case "setup": {
        const result = await twoFactorService.setup(session.user.id);
        return NextResponse.json({ success: true, data: result });
      }
      case "enable": {
        const { token } = tokenSchema.parse(body);
        const result = await twoFactorService.enable(session.user.id, token);
        return NextResponse.json({ success: true, data: result });
      }
      case "disable": {
        const { token } = tokenSchema.parse(body);
        await twoFactorService.disable(session.user.id, token);
        return NextResponse.json({ success: true });
      }
      case "verify": {
        const { token } = tokenSchema.parse(body);
        const valid = await twoFactorService.verify(session.user.id, token);
        return NextResponse.json({ success: valid });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "2FA failed" }, { status: 400 });
  }
}
