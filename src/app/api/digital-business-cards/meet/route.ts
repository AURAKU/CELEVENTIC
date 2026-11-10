import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isCeleCardPubliclyReachable } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import {
  compactMeetingDesk,
  listOpenMeetingSlots,
  parseMeetingBooking,
  persistMeetingDesk,
  serializeMeetingBooking,
} from "@/lib/digital-business-card/meetings";
import { normalizeSocials } from "@/lib/digital-business-card/socials";
import { DEMO_CARD, isDemoCardSlug } from "@/lib/digital-business-card/demo-card";
import { dummyLiveNotFoundJson } from "@/lib/digital-business-card/demo-live-access";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { notificationService } from "@/services/notifications/notification.service";
import { communicationService } from "@/services/communications/communication.service";
import { createSmartCardConnection, getDigitalCardBySlug } from "@/services/digital-business-card/digital-business-card.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  start: z.string().min(10).max(40),
  visitorName: z.string().min(2).max(120),
  visitorEmail: z.string().email().max(200).optional().nullable(),
  visitorPhone: z.string().max(40).optional().nullable(),
  note: z.string().max(280).optional().nullable(),
  website: z.string().max(0).optional().nullable(),
});

function deskForSocials(socials: unknown) {
  const parsed = normalizeSocials(socials);
  return persistMeetingDesk(parsed.meeting) ?? compactMeetingDesk(parsed.meeting);
}

async function takenStartsForCard(cardId: string): Promise<string[]> {
  const rows = await prisma.smartCardConnection.findMany({
    where: { cardId, source: "meeting", NOT: { status: "ARCHIVED" } },
    select: { note: true },
    take: 200,
  });
  return rows
    .map((row) => parseMeetingBooking(row.note)?.start)
    .filter((value): value is string => Boolean(value));
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() || "";
  if (!slug) return NextResponse.json({ error: "Missing card" }, { status: 400 });

  if (isDemoCardSlug(slug)) {
    const blocked = await dummyLiveNotFoundJson();
    if (blocked) return blocked;
    const desk = deskForSocials(DEMO_CARD.socials);
    if (!desk?.enabled) return NextResponse.json({ slots: [] });
    return NextResponse.json({ slots: listOpenMeetingSlots(desk), timezone: desk.timezone });
  }

  const card = await getDigitalCardBySlug(slug);
  if (!card || !isCeleCardPubliclyReachable(card, await getCeleCardLifecyclePolicy())) {
    return NextResponse.json({ error: "Card unavailable" }, { status: 404 });
  }
  const desk = deskForSocials(card.socials);
  if (!desk?.enabled) return NextResponse.json({ slots: [] });
  const taken = await takenStartsForCard(card.id);
  return NextResponse.json({ slots: listOpenMeetingSlots(desk, taken), timezone: desk.timezone });
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meeting details" }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const ip = requestClientIp(req);
  const perCard = await rateLimit(`celecard-meet:${parsed.data.slug}:${ip}`, 5, 300);
  const perIp = await rateLimit(`celecard-meet-ip:${ip}`, 20, 300);
  if (!perCard.success || !perIp.success) {
    return NextResponse.json({ error: "Too many booking attempts. Try again later." }, { status: 429 });
  }

  if (isDemoCardSlug(parsed.data.slug)) {
    const blocked = await dummyLiveNotFoundJson();
    if (blocked) return blocked;
    return NextResponse.json({ ok: true, connectionId: "demo" });
  }

  const card = await getDigitalCardBySlug(parsed.data.slug);
  if (!card || !isCeleCardPubliclyReachable(card, await getCeleCardLifecyclePolicy())) {
    return NextResponse.json({ error: "Card unavailable" }, { status: 404 });
  }
  const desk = deskForSocials(card.socials);
  if (!desk?.enabled) {
    return NextResponse.json({ error: "Meetings are not open on this card" }, { status: 403 });
  }

  const taken = await takenStartsForCard(card.id);
  const open = listOpenMeetingSlots(desk, taken);
  const slot = open.find((item) => item.start === parsed.data.start);
  if (!slot) {
    return NextResponse.json({ error: "That time is no longer open. Pick another." }, { status: 409 });
  }

  try {
    const connection = await createSmartCardConnection({
      cardId: card.id,
      visitorName: parsed.data.visitorName,
      visitorEmail: parsed.data.visitorEmail,
      visitorPhone: parsed.data.visitorPhone,
      note: serializeMeetingBooking({
        start: slot.start,
        end: slot.end,
        timezone: desk.timezone,
        title: desk.title,
        place: desk.place,
        note: parsed.data.note?.trim() || "",
      }),
      formMode: "Meeting",
      source: "meeting",
      tags: ["meeting"],
    });

    const owner = await prisma.user.findUnique({
      where: { id: card.userId },
      select: { id: true, email: true, name: true },
    });
    if (owner) {
      const when = new Intl.DateTimeFormat("en-GB", {
        timeZone: desk.timezone,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(slot.start));
      const title = "New meeting request on your CeleYou";
      const message = [
        `${parsed.data.visitorName} asked for ${desk.title} on ${when}.`,
        parsed.data.visitorEmail || parsed.data.visitorPhone || "",
        "Open your CeleYou studio inbox to reply.",
      ]
        .filter(Boolean)
        .join(" ");
      await notificationService.notify(owner.id, {
        title,
        message,
        type: "CELECARD_MEETING_REQUEST",
        link: "/dashboard/business-card",
      });
      if (owner.email) {
        await communicationService.trySendDirect({
          channel: "EMAIL",
          to: owner.email,
          subject: title,
          body: `Hello ${card.displayName.split(" ")[0] || "there"},\n\n${message}\n\nThe CeleYou Team`,
        });
      }
    }

    return NextResponse.json({ ok: true, connectionId: connection.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this meeting";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
