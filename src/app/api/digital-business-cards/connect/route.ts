import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guestMayUsePublicAction, isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import {
  createSmartCardConnection,
  getDigitalCardBySlug,
} from "@/services/digital-business-card/digital-business-card.service";
import { DEMO_CARD, isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { dummyLiveNotFoundJson } from "@/lib/digital-business-card/demo-live-access";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  visitorName: z.string().min(2).max(120),
  visitorEmail: z.string().email().max(200).optional().nullable(),
  visitorPhone: z.string().max(40).optional().nullable(),
  visitorCompany: z.string().max(160).optional().nullable(),
  visitorTitle: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  /** Honeypot. Bots fill this; humans leave blank */
  website: z.string().max(0).optional().nullable(),
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
    return NextResponse.json({ error: "Invalid connection details" }, { status: 400 });
  }

  // Honeypot tripped
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const ip = requestClientIp(req);
  const perCard = await rateLimit(`celecard-connect:${parsed.data.slug}:${ip}`, 5, 300);
  const perIp = await rateLimit(`celecard-connect-ip:${ip}`, 30, 300);
  if (!perCard.success || !perIp.success) {
    return NextResponse.json({ error: "Too many connection attempts. Try again later." }, { status: 429 });
  }

  if (isDemoCardSlug(parsed.data.slug)) {
    const blocked = await dummyLiveNotFoundJson();
    if (blocked) return blocked;
    return NextResponse.json({
      ok: true,
      connectionId: "demo",
      ownerName: DEMO_CARD.displayName,
    });
  }

  const card = await getDigitalCardBySlug(parsed.data.slug);
  const policy = await getCeleCardLifecyclePolicy();
  if (!card || !isCeleCardPubliclyReachable(card, policy)) {
    return NextResponse.json({ error: "Card unavailable" }, { status: 404 });
  }
  if (!guestMayUsePublicAction(card, "connect", policy)) {
    return NextResponse.json({ error: "Connect Back is disabled" }, { status: 403 });
  }

  try {
    const connection = await createSmartCardConnection({
      cardId: card.id,
      visitorName: parsed.data.visitorName,
      visitorEmail: parsed.data.visitorEmail,
      visitorPhone: parsed.data.visitorPhone,
      visitorCompany: parsed.data.visitorCompany,
      visitorTitle: parsed.data.visitorTitle,
      note: parsed.data.note,
      formMode: "Instant",
    });
    return NextResponse.json({
      ok: true,
      connectionId: connection.id,
      ownerName: card.displayName,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save connection";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
