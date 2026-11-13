import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { createProximitySession } from "@/services/digital-business-card/proximity.service";
import { prisma } from "@/lib/prisma";
import { getCeleYouConnectFlags } from "@/lib/celeyou-connect/flags";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  cardId: z.string().min(8).max(40),
  transport: z.enum(["qr", "code", "ble", "nfc-card"]).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const open = await prisma.celeYouProximitySession.findFirst({
    where: {
      OR: [{ hostUserId: session.user.id }, { peerUserId: session.user.id }],
      status: { in: ["DISCOVERING", "PEER_FOUND", "REQUEST_PENDING", "APPROVED"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return NextResponse.json({ success: true, data: { sessionId: open?.id ?? null } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = requestClientIp(req);
  const flags = await getCeleYouConnectFlags();
  const limited = await rateLimit(
    `celecard-tap-create:${session.user.id}`,
    flags.tap_session_create_limit,
    300
  );
  if (!limited.success) {
    return NextResponse.json({ error: "Too many Tap sessions. Wait a moment." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a CeleYou to share." }, { status: 400 });
  try {
    const view = await createProximitySession({
      userId: session.user.id,
      cardId: parsed.data.cardId,
      transport: parsed.data.transport,
      ip,
    });
    return NextResponse.json({ success: true, data: view }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open Tap Mode";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
