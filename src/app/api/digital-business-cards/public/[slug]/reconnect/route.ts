import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isCeleCardCourtesyReachable } from "@/lib/digital-business-card/access";
import { DEFAULT_CELECARD_LIFECYCLE_POLICY } from "@/lib/digital-business-card/lifecycle";
import { getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";
import { createCourtesyReconnect } from "@/services/digital-business-card/courtesy-reconnect.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import {
  DEMO_COURTESY_SLUG,
  isDemoCourtesySlug,
} from "@/lib/digital-business-card/demo-card";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  visitorName: z.string().max(120).optional().nullable(),
  visitorEmail: z.string().email().max(200).optional().nullable().or(z.literal("")),
  visitorPhone: z.string().max(40).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  consent: z.boolean().optional(),
  anonymous: z.boolean().optional(),
  website: z.string().max(0).optional().nullable(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  if (isDemoCourtesySlug(slug) || slug === DEMO_COURTESY_SLUG) {
    return NextResponse.json({ ok: true, connectionId: "demo-courtesy" });
  }

  const ip = requestClientIp(req);
  const policy = await getCeleCardLifecyclePolicy().catch(() => DEFAULT_CELECARD_LIFECYCLE_POLICY);
  const perCard = await rateLimit(
    `celecard-reconnect:${slug}:${ip}`,
    policy.reconnectPerCardPerHour,
    3600
  );
  const perIp = await rateLimit(`celecard-reconnect-ip:${ip}`, policy.reconnectPerIpPerHour, 3600);
  if (!perCard.success || !perIp.success) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || card.deletedAt || !isCeleCardCourtesyReachable(card, policy)) {
    return NextResponse.json({ error: "Card unavailable" }, { status: 404 });
  }

  const anonymous = parsed.data.anonymous === true;
  try {
    const result = await createCourtesyReconnect({
      cardId: card.id,
      ownerUserId: card.userId,
      ownerDisplayName: card.displayName,
      ownerEmail: card.email,
      visitorName: anonymous ? null : parsed.data.visitorName,
      visitorEmail: anonymous ? null : parsed.data.visitorEmail || null,
      visitorPhone: anonymous ? null : parsed.data.visitorPhone || null,
      note: parsed.data.note,
      consent: anonymous ? true : Boolean(parsed.data.consent),
      ip,
      policy,
    });
    return NextResponse.json({ ok: true, connectionId: result.id, duplicate: result.duplicate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
