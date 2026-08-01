import { NextResponse } from "next/server";
import { z } from "zod";
import { guestWishService } from "@/services/invitations/guest-wish.service";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import { parseGuestbookConfig, isGuestbookOpen } from "@/lib/thank-you/resolve-design";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

async function resolvePublishedEvent(input: {
  eventId?: string | null;
  token?: string | null;
}): Promise<{ eventId: string; guestbookConfig: unknown } | null> {
  if (input.token) {
    const page = await thankYouService.getPublishedByShareToken(input.token);
    if (!page) return null;
    return { eventId: page.eventId, guestbookConfig: page.guestbookConfig };
  }
  if (input.eventId) {
    const page = await prisma.thankYouPage.findFirst({
      where: { eventId: input.eventId, status: "PUBLISHED" },
      select: { eventId: true, guestbookConfig: true },
    });
    if (!page) return null;
    return page;
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resolved = await resolvePublishedEvent({
    eventId: url.searchParams.get("eventId"),
    token: url.searchParams.get("token"),
  });
  if (!resolved) {
    return NextResponse.json({ error: "Thank-you page not found" }, { status: 404 });
  }

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await guestWishService.listForEvent(resolved.eventId, page, Math.min(limit, 50), {
    publicOnly: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString?.() ?? item.createdAt,
        editedAt: item.editedAt ? (item.editedAt as Date).toISOString?.() ?? item.editedAt : null,
      })),
    },
  });
}

const createSchema = z.object({
  eventId: z.string().min(1).optional(),
  token: z.string().optional(),
  authorName: z.string().min(1).max(80),
  message: z.string().min(2).max(1000),
  title: z.string().max(120).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  isAnonymous: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const limited = await rateLimit(`thank-you-message:${ip}`, 8, 60);
    if (!limited.success) {
      return NextResponse.json(
        { error: "Too many messages. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const resolved = await resolvePublishedEvent({
      eventId: body.eventId,
      token: body.token,
    });
    if (!resolved) {
      return NextResponse.json({ error: "Thank-you page not found" }, { status: 404 });
    }

    const guestbook = parseGuestbookConfig(resolved.guestbookConfig);
    if (!isGuestbookOpen(guestbook)) {
      return NextResponse.json(
        {
          error:
            guestbook.closedMessage ||
            "Guest messages for this celebration are now closed.",
        },
        { status: 403 }
      );
    }

    if (body.isAnonymous && !guestbook.allowAnonymous) {
      return NextResponse.json({ error: "Anonymous posting is not enabled" }, { status: 400 });
    }
    if (body.avatarUrl && !guestbook.allowAvatar) {
      return NextResponse.json({ error: "Profile photos are not enabled" }, { status: 400 });
    }

    const maxLen = guestbook.maxMessageLength ?? 800;
    if (body.message.trim().length > maxLen) {
      return NextResponse.json(
        { error: `Please keep your message under ${maxLen} characters` },
        { status: 400 }
      );
    }

    const wish = await guestWishService.create({
      eventId: resolved.eventId,
      authorName: body.authorName,
      message: body.message.slice(0, maxLen),
      title: guestbook.allowTitle ? body.title : null,
      avatarUrl: guestbook.allowAvatar ? body.avatarUrl : null,
      isAnonymous: Boolean(body.isAnonymous),
      source: "THANK_YOU_PAGE",
      requireApproval: Boolean(guestbook.requireApproval),
      issueAuthorToken: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: wish.id,
          status: wish.status,
          authorToken: wish.authorToken,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post message" },
      { status: 400 }
    );
  }
}
