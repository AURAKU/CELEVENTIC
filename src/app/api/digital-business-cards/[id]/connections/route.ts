import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { requestClientIp } from "@/lib/http/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { CELECARD_LEAD_STATUSES } from "@/lib/digital-business-card/leads";
import { meetingReplyCopy, parseMeetingBooking } from "@/lib/digital-business-card/meetings";
import { communicationService } from "@/services/communications/communication.service";
import {
  listCardConnections,
  updateCardConnectionStatus,
} from "@/services/digital-business-card/courtesy-reconnect.service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  connectionId: z.string().min(8).max(80),
  status: z.enum(CELECARD_LEAD_STATUSES),
  meetingReply: z.enum(["confirm", "decline"]).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const status = req.nextUrl.searchParams.get("status");
  const data = await listCardConnections(
    session.user.id,
    id,
    Number.isFinite(page) ? page : 1,
    status
  );
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown request status" }, { status: 400 });
  }

  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-leads:${session.user.id}:${ip}`, 40, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many inbox updates. Try again later." }, { status: 429 });
  }

  const nextStatus =
    parsed.data.meetingReply === "confirm"
      ? "WON"
      : parsed.data.meetingReply === "decline"
        ? "ARCHIVED"
        : parsed.data.status;
  const result = await updateCardConnectionStatus(
    session.user.id,
    id,
    parsed.data.connectionId,
    nextStatus
  );
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  if (parsed.data.meetingReply) {
    const connection = result.connection;
    const booking = connection.source === "meeting" ? parseMeetingBooking(connection.note) : null;
    if (booking && connection.visitorEmail) {
      const card = await prisma.digitalBusinessCard.findFirst({
        where: { id, userId: session.user.id },
        select: { displayName: true },
      });
      const copy = meetingReplyCopy({
        kind: parsed.data.meetingReply,
        ownerName: card?.displayName || session.user.name || "CeleYou",
        guestName: connection.visitorName,
        booking,
      });
      await communicationService.trySendDirect({
        channel: "EMAIL",
        to: connection.visitorEmail,
        subject: copy.subject,
        body: `${copy.body}\n\nThe CeleYou Team`,
      });
    }
  }

  return NextResponse.json({ success: true, data: result.connection });
}
