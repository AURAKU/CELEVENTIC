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
import { prisma } from "@/lib/prisma";
import { finalizeGuestConnectBack } from "@/services/celeyou-connect/connect.service";
import { normalizeGuestPhone } from "@/lib/celeyou-connect/pair";
import {
  assertTapGuestSessionForCard,
  recordTapGuestReceipt,
} from "@/services/digital-business-card/proximity.service";
import { getCeleYouConnectFlags } from "@/lib/celeyou-connect/flags";
import { isCeleventicDomain } from "@/lib/app-url";

const GUEST_DUPLICATE_WINDOW_MS = 6 * 60 * 60 * 1000;

function tapOriginAllowed(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    return isCeleventicDomain(hostname);
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  visitorName: z.string().min(2).max(120),
  visitorEmail: z.string().email().max(200).optional().nullable(),
  visitorPhone: z.string().max(120).optional().nullable(),
  visitorCompany: z.string().max(160).optional().nullable(),
  visitorTitle: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  consent: z.boolean(),
  followupConsent: z.boolean().optional(),
  /** Honeypot. Bots fill this; humans leave blank */
  website: z.string().max(200).optional().nullable(),
  tapJoinCode: z.string().max(128).optional().nullable(),
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

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.consent !== true) {
    return NextResponse.json({ error: "Consent is required" }, { status: 400 });
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

  const flags = await getCeleYouConnectFlags();
  const tapJoinCode = parsed.data.tapJoinCode?.trim() || "";
  if (tapJoinCode) {
    if (!tapOriginAllowed(req)) {
      return NextResponse.json({ error: "That connection QR is not open." }, { status: 403 });
    }
    if (!flags.tap_mode_enabled || !flags.tap_guest_exchange) {
      return NextResponse.json({ error: "Tap Mode exchange is paused." }, { status: 403 });
    }
    const tap = await assertTapGuestSessionForCard(tapJoinCode, card.id);
    if (tap.status !== 200) {
      return NextResponse.json({ error: tap.error }, { status: tap.status });
    }
  }

  const visitorEmail = parsed.data.visitorEmail?.trim().toLowerCase() || null;
  const visitorPhone = normalizeGuestPhone(parsed.data.visitorPhone);
  if (!visitorEmail && !visitorPhone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  }
  const since = new Date(Date.now() - GUEST_DUPLICATE_WINDOW_MS);
  const duplicateWhere = [
    visitorEmail ? { visitorEmail } : undefined,
    visitorPhone ? { visitorPhone } : undefined,
  ].filter(Boolean) as Array<{ visitorEmail: string } | { visitorPhone: string }>;
  const duplicate = duplicateWhere.length
    ? await prisma.smartCardConnection.findFirst({
        where: { cardId: card.id, createdAt: { gte: since }, OR: duplicateWhere },
        select: { id: true },
      })
    : null;

  try {
    if (duplicate) {
      if (tapJoinCode) {
        await recordTapGuestReceipt({ joinCode: tapJoinCode, visitorName: parsed.data.visitorName });
      }
      return NextResponse.json({
        ok: true,
        connectionId: duplicate.id,
        ownerName: card.displayName,
        duplicate: true,
      });
    }

    if (tapJoinCode) {
      const tap = await assertTapGuestSessionForCard(tapJoinCode, card.id);
      if (tap.status !== 200) {
        return NextResponse.json({ error: tap.error }, { status: tap.status });
      }
    }

    const connection = await createSmartCardConnection({
      cardId: card.id,
      visitorName: parsed.data.visitorName,
      visitorEmail,
      visitorPhone,
      visitorCompany: parsed.data.visitorCompany,
      visitorTitle: parsed.data.visitorTitle,
      note: parsed.data.note,
      formMode: "Instant",
      source: tapJoinCode ? "tap_mode_qr" : "connect_back",
      tags: [],
    });
    const sessionId = tapJoinCode
      ? await recordTapGuestReceipt({ joinCode: tapJoinCode, visitorName: parsed.data.visitorName })
      : null;
    if (sessionId) {
      await prisma.smartCardConnection.update({
        where: { id: connection.id },
        data: { tags: [`tap_session:${sessionId}`] },
      }).catch(() => undefined);
    }
    const owner = await prisma.user.findUnique({
      where: { id: card.userId },
      select: { email: true },
    });
    await finalizeGuestConnectBack({
      connectionId: connection.id,
      cardId: card.id,
      ownerUserId: card.userId,
      ownerDisplayName: card.displayName,
      ownerEmail: owner?.email,
      visitorName: parsed.data.visitorName,
      visitorEmail,
      followupConsent: parsed.data.followupConsent === true,
      source: tapJoinCode ? "tap_mode_qr" : "connect_back",
    }).catch(() => undefined);
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
