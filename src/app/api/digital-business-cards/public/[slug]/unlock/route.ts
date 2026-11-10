import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { grantCookieOptions, unlockCeleCardWithCode } from "@/services/digital-business-card/celecard-access.service";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { dummyLiveNotFoundJson } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().min(4).max(8),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ip = requestClientIp(req);
  const perCard = await rateLimit(`celecard-unlock:${slug}:${ip}`, 5, 300);
  const perIp = await rateLimit(`celecard-unlock-ip:${ip}`, 20, 300);
  if (!perCard.success || !perIp.success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a four-character code" }, { status: 400 });
  }

  if (isDemoCardSlug(slug)) {
    const blocked = await dummyLiveNotFoundJson();
    if (blocked) return blocked;
    return NextResponse.json({ error: "Demo cards stay public" }, { status: 400 });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || !isCeleCardPubliclyReachable(card, await getCeleCardLifecyclePolicy())) {
    return NextResponse.json({ error: "Card unavailable" }, { status: 404 });
  }

  const result = await unlockCeleCardWithCode(card.id, parsed.data.code);
  if (!result.ok) {
    return NextResponse.json({ error: "That code did not unlock anything" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(result.cookieName, result.token, grantCookieOptions(result.expiresAt));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
