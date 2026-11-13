import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import {
  confirmCeleYouExchange,
  previewCeleYouExchange,
} from "@/services/celeyou-connect/connect.service";
import { recordTapGuestReceipt } from "@/services/digital-business-card/proximity.service";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  slug: z.string().min(1).max(80),
  visitorCardId: z.string().min(8).max(80).optional().nullable(),
  confirm: z.literal(true),
  tapJoinCode: z.string().max(128).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to exchange cards." }, { status: 401 });
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "Missing card" }, { status: 400 });
  if (isDemoCardSlug(slug)) {
    return NextResponse.json({ error: "Demo cards cannot exchange." }, { status: 404 });
  }
  const result = await previewCeleYouExchange({
    visitorUserId: session.user.id,
    hostSlug: slug,
    visitorCardId: req.nextUrl.searchParams.get("visitorCardId"),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to exchange cards." }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = confirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirm the exchange to share your CeleYou details." }, { status: 400 });
  }
  if (isDemoCardSlug(parsed.data.slug)) {
    return NextResponse.json({ error: "Demo cards cannot exchange." }, { status: 404 });
  }

  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-exchange:${session.user.id}:${ip}`, 8, 300);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many exchange attempts. Try again later." }, { status: 429 });
  }

  const result = await confirmCeleYouExchange({
    visitorUserId: session.user.id,
    hostSlug: parsed.data.slug,
    visitorCardId: parsed.data.visitorCardId,
    confirm: true,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const tapJoinCode = parsed.data.tapJoinCode?.trim();
  if (tapJoinCode) {
    await recordTapGuestReceipt({
      joinCode: tapJoinCode,
      visitorName: session.user.name || "CeleYou member",
    }).catch(() => undefined);
  }
  return NextResponse.json({ success: true, data: result });
}
