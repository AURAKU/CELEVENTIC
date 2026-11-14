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
  updateCardConnectionStatus,
} from "@/services/digital-business-card/courtesy-reconnect.service";
import {
  completeOwnerReminder,
  deleteOwnerConnection,
  listOwnerConnections,
  scheduleOwnerReminder,
  syncLeadStatusEffects,
  toOwnerConnectionView,
  updateOwnerConnectionLabels,
} from "@/services/celeyou-connect/workspace.service";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  connectionId: z.string().min(8).max(80),
  status: z.enum(CELECARD_LEAD_STATUSES).optional(),
  ownerNote: z.string().max(1000).nullable().optional(),
  meetingReply: z.enum(["confirm", "decline"]).optional(),
  labels: z.array(z.string().max(24)).max(8).optional(),
  delete: z.boolean().optional(),
  reminderHours: z.union([z.literal(1), z.literal(24), z.literal(72), z.literal(168)]).optional(),
  reminderNote: z.string().max(200).nullable().optional(),
  completeReminderId: z.string().min(8).max(80).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const data = await listOwnerConnections(session.user.id, id, {
    page: Number.isFinite(page) ? page : 1,
    status: req.nextUrl.searchParams.get("status"),
    query: req.nextUrl.searchParams.get("q"),
    source: req.nextUrl.searchParams.get("source"),
    label: req.nextUrl.searchParams.get("label"),
  });
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

  if (parsed.data.delete) {
    const deleted = await deleteOwnerConnection(session.user.id, id, parsed.data.connectionId);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ("error" in deleted) return NextResponse.json({ error: deleted.error }, { status: 400 });
    return NextResponse.json({ success: true, data: { deleted: true, id: deleted.id } });
  }
  if (parsed.data.completeReminderId) {
    const done = await completeOwnerReminder(session.user.id, id, parsed.data.completeReminderId);
    if (!done) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ("error" in done) return NextResponse.json({ error: done.error }, { status: 400 });
    return NextResponse.json({ success: true, data: { reminder: done.reminder } });
  }
  if (parsed.data.reminderHours) {
    const reminder = await scheduleOwnerReminder(
      session.user.id,
      id,
      parsed.data.connectionId,
      parsed.data.reminderHours,
      parsed.data.reminderNote
    );
    if (!reminder) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ("error" in reminder) return NextResponse.json({ error: reminder.error }, { status: 400 });
  }
  if (parsed.data.labels) {
    const labeled = await updateOwnerConnectionLabels(
      session.user.id,
      id,
      parsed.data.connectionId,
      parsed.data.labels
    );
    if (!labeled) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ("error" in labeled) return NextResponse.json({ error: labeled.error }, { status: 400 });
  }
  const nextStatus =
    parsed.data.meetingReply === "confirm"
      ? "WON"
      : parsed.data.meetingReply === "decline"
        ? "ARCHIVED"
        : parsed.data.status;
  let result: Awaited<ReturnType<typeof updateCardConnectionStatus>> = null;
  if (nextStatus) {
    result = await updateCardConnectionStatus(
      session.user.id,
      id,
      parsed.data.connectionId,
      nextStatus
    );
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await syncLeadStatusEffects(session.user.id, id, parsed.data.connectionId, nextStatus);
  }
  if (parsed.data.ownerNote !== undefined) {
    const owned = await prisma.digitalBusinessCard.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.smartCardConnection.updateMany({
      where: { id: parsed.data.connectionId, cardId: id },
      data: { ownerNote: parsed.data.ownerNote?.trim() || null },
    });
    if (!updated.count) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const connection = await prisma.smartCardConnection.findFirst({
      where: { id: parsed.data.connectionId, cardId: id },
    });
    if (connection) {
      await prisma.celeYouConnectEvent
        .create({
          data: {
            connectionId: connection.id,
            cardId: id,
            kind: "NOTE_ADDED",
            actorUserId: session.user.id,
          },
        })
        .catch(() => undefined);
      result = { connection };
    }
  }
  if (!result || !("connection" in result)) {
    const fallback = await prisma.smartCardConnection.findFirst({
      where: { id: parsed.data.connectionId, cardId: id },
    });
    if (!fallback) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    result = { connection: fallback };
  }

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

  const fresh = await prisma.smartCardConnection.findFirst({
    where: { id: parsed.data.connectionId, cardId: id },
    include: {
      reminders: {
        where: { status: { in: ["SCHEDULED", "DUE"] } },
        orderBy: { dueAt: "asc" },
        take: 1,
      },
    },
  });
  const view = fresh
    ? toOwnerConnectionView(fresh)
    : result.connection
      ? toOwnerConnectionView({ ...result.connection, reminders: [] })
      : result.connection;
  return NextResponse.json({ success: true, data: view });
}
