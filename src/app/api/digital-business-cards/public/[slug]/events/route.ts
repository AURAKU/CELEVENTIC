import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestClientIp } from "@/lib/http/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import {
  isAutomatedPreviewAgent,
  isCeleYouPublicEventKind,
} from "@/lib/celeyou-share/events";
import {
  getDigitalCardBySlug,
  recordSmartCardInteraction,
} from "@/services/digital-business-card/digital-business-card.service";
import { resolveCeleYouPublicShare } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import { isDemoCardSlug } from "@/lib/digital-business-card/demo-card";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.string().min(3).max(40),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isCeleYouPublicEventKind(parsed.data.kind)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") || "";
  if (isAutomatedPreviewAgent(ua) || isDemoCardSlug(slug)) {
    return new NextResponse(null, { status: 204 });
  }

  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-public-event:${ip}:${slug}`, 40, 60);
  if (!limited.success) return new NextResponse(null, { status: 204 });

  const card = await getDigitalCardBySlug(slug);
  const share = resolveCeleYouPublicShare({
    card,
    channel: "profile",
    policy: await getCeleCardLifecyclePolicy(),
  });
  if (!share.guestShareable) {
    return new NextResponse(null, { status: 204 });
  }

  await recordSmartCardInteraction(card.id, parsed.data.kind, { surface: "public" });
  return new NextResponse(null, { status: 204 });
}
