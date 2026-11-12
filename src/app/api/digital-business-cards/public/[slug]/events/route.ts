import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { requestClientIp } from "@/lib/http/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { isCeleYouPublicEventKind, shouldCountCeleYouGuestStat } from "@/lib/celeyou-share/events";
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

async function readEventBody(req: NextRequest) {
  const raw = await req.text().catch(() => "");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = bodySchema.safeParse(await readEventBody(req));
  if (!parsed.success || !isCeleYouPublicEventKind(parsed.data.kind)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  if (isDemoCardSlug(slug)) {
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
  if (!card || !share.guestShareable) {
    return new NextResponse(null, { status: 204 });
  }

  const session = await getSession();
  if (
    !shouldCountCeleYouGuestStat({
      ownerUserId: card.userId,
      viewerUserId: session?.user?.id,
      userAgent: req.headers.get("user-agent") || "",
    })
  ) {
    return new NextResponse(null, { status: 204 });
  }

  await recordSmartCardInteraction(card.id, parsed.data.kind, { surface: "public" });
  return new NextResponse(null, { status: 204 });
}
