import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { guestWishService } from "@/services/invitations/guest-wish.service";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { isPlatformAdmin } from "@/lib/rbac";

/** True when viewer may hard-delete wishes for this event. */
async function canModerateEventWishes(
  eventId: string,
  userId: string | undefined,
  role: UserRole | undefined
): Promise<boolean> {
  if (!userId || !role) return false;
  if (isPlatformAdmin(role)) return true;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  return event?.organizerId === userId;
}

const createSchema = z.object({
  eventId: z.string().min(1),
  invitationId: z.string().optional(),
  guestId: z.string().optional(),
  authorName: z.string().min(1).max(80),
  message: z.string().min(2).max(1000),
  /** Optional invite link for public verification */
  link: z.string().optional(),
});

async function resolveEventId(params: {
  eventId?: string | null;
  link?: string | null;
  invitationId?: string | null;
}): Promise<{ eventId: string; invitationId?: string } | null> {
  if (params.link) {
    const invitation = await prisma.invitation.findUnique({
      where: { uniqueLink: params.link },
      select: { id: true, eventId: true },
    });
    if (!invitation) return null;
    return { eventId: invitation.eventId, invitationId: invitation.id };
  }

  if (params.invitationId) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.invitationId },
      select: { id: true, eventId: true },
    });
    if (!invitation) return null;
    if (params.eventId && params.eventId !== invitation.eventId) return null;
    return { eventId: invitation.eventId, invitationId: invitation.id };
  }

  if (params.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      select: { id: true },
    });
    if (!event) return null;
    return { eventId: event.id };
  }

  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resolved = await resolveEventId({
    eventId: url.searchParams.get("eventId"),
    link: url.searchParams.get("link"),
    invitationId: url.searchParams.get("invitationId"),
  });

  if (!resolved) {
    return NextResponse.json({ error: "eventId or invite link required" }, { status: 400 });
  }

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await guestWishService.listForEvent(resolved.eventId, page, Math.min(limit, 100));

  const session = await getServerSession(authOptions);
  const canModerate = await canModerateEventWishes(
    resolved.eventId,
    session?.user?.id,
    session?.user?.role as UserRole | undefined
  );

  return NextResponse.json({ success: true, data: { ...data, canModerate } });
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const resolved = await resolveEventId({
      eventId: body.eventId,
      link: body.link,
      invitationId: body.invitationId,
    });
    if (!resolved) {
      return NextResponse.json({ error: "Invalid event or invitation" }, { status: 400 });
    }

    const wish = await guestWishService.create({
      eventId: resolved.eventId,
      invitationId: body.invitationId ?? resolved.invitationId,
      guestId: body.guestId,
      authorName: body.authorName,
      message: body.message,
    });

    return NextResponse.json({ success: true, data: wish }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save wish" },
      { status: 400 }
    );
  }
}
