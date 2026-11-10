import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { createCeleCardAccessRequest } from "@/services/digital-business-card/celecard-access.service";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { dummyLiveNotFoundJson } from "@/lib/digital-business-card/demo-live-access";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  itemKey: z.string().min(1).max(80),
  visitorName: z.string().min(2).max(120),
  visitorContact: z.string().min(5).max(200),
  message: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ip = requestClientIp(req);
  const perCard = await rateLimit(`celecard-access-request:${slug}:${ip}`, 5, 300);
  const perIp = await rateLimit(`celecard-access-request-ip:${ip}`, 20, 300);
  if (!perCard.success || !perIp.success) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your name and a contact method" }, { status: 400 });
  }

  if (isDemoCardSlug(slug)) {
    const blocked = await dummyLiveNotFoundJson();
    if (blocked) return blocked;
    return NextResponse.json({ ok: true, requestId: "demo" });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || !isCeleCardPubliclyReachable(card, await getCeleCardLifecyclePolicy())) {
    return NextResponse.json({ error: "Card unavailable" }, { status: 404 });
  }

  try {
    const request = await createCeleCardAccessRequest({
      cardId: card.id,
      itemKeys: [parsed.data.itemKey],
      visitorName: parsed.data.visitorName,
      visitorContact: parsed.data.visitorContact,
      message: parsed.data.message,
    });
    return NextResponse.json({ ok: true, requestId: request.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
