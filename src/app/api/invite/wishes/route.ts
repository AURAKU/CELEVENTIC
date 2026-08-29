import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import {
  guestWishService,
  isWishEventModerator,
} from "@/services/invitations/guest-wish.service";
import { prisma } from "@/lib/prisma";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { repairInviteLink } from "@/services/invitations/invite-link-resolver.service";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import {
  addPreviewWish,
  listPreviewWishes,
  previewWishWallKey,
  previewWishesEnabled,
} from "@/lib/invitation/preview-wish-wall";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function blankToUndefined(value: unknown): unknown {
  return typeof value === "string" && !value.trim() ? undefined : value;
}

const createSchema = z
  .object({
    eventId: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    invitationId: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    guestId: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    authorName: z.string().trim().min(1, "Please enter your name").max(80),
    message: z.string().trim().min(2, "Please write a short note").max(1000),
    /** Invite uniqueLink — enough to authorize a public guest post. */
    link: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  })
  .refine((value) => Boolean(value.eventId || value.invitationId || value.link), {
    message: "Invitation link required",
  });

async function resolveInviteAccess(params: {
  eventId?: string | null;
  link?: string | null;
  invitationId?: string | null;
}): Promise<{
  eventId: string;
  invitationId?: string;
  invitationStatus?: string;
} | null> {
  if (params.link) {
    const select = { id: true, eventId: true, status: true };
    let invitation = await prisma.invitation.findUnique({
      where: { uniqueLink: params.link },
      select,
    });
    // Wishes are posted from the invitation page, which may itself have been
    // reached through a repaired link; accept the same forms here so the
    // guestbook does not 400 on a page that rendered fine.
    if (!invitation) {
      const repaired = await repairInviteLink(params.link);
      if (repaired) {
        invitation = await prisma.invitation.findUnique({
          where: { uniqueLink: repaired },
          select,
        });
      }
    }
    if (!invitation) return null;
    return {
      eventId: invitation.eventId,
      invitationId: invitation.id,
      invitationStatus: invitation.status,
    };
  }

  if (params.invitationId) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.invitationId },
      select: { id: true, eventId: true, status: true },
    });
    if (!invitation) return null;
    if (params.eventId && params.eventId !== invitation.eventId) return null;
    return {
      eventId: invitation.eventId,
      invitationId: invitation.id,
      invitationStatus: invitation.status,
    };
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
  const link = url.searchParams.get("link");
  const invitationId = url.searchParams.get("invitationId");
  const resolved = await resolveInviteAccess({
    eventId: url.searchParams.get("eventId"),
    link,
    invitationId,
  });

  if (!resolved) {
    const previewKey = previewWishWallKey(link, invitationId);
    if (previewKey) {
      const items = previewWishesEnabled() ? listPreviewWishes(previewKey) : [];
      return NextResponse.json(
        {
          success: true,
          data: {
            items,
            total: items.length,
            page: 1,
            limit: Math.max(items.length, 1),
            pages: 1,
            hasMore: false,
            canModerate: false,
            canEdit: false,
          },
        },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } }
      );
    }
    return NextResponse.json({ error: "eventId or invite link required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const canModerate = await isWishEventModerator(
    resolved.eventId,
    session?.user?.id,
    session?.user?.role as UserRole | undefined
  );

  // Guests must prove invitation access via link / invitationId.
  // Organizers may list event-wide without an invitation.
  if (!resolved.invitationId && !canModerate) {
    return NextResponse.json(
      { error: "Invite link or invitationId required" },
      { status: 400 }
    );
  }

  if (
    resolved.invitationId &&
    !canModerate &&
    resolved.invitationStatus === "EXPIRED"
  ) {
    return NextResponse.json({ error: "Invitation is no longer active" }, { status: 403 });
  }

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await guestWishService.listForEvent(
    resolved.eventId,
    page,
    Math.min(limit, 25),
    {
      // Authorized via invitation link above — feed itself is event-wide approved wishes.
      publicOnly: !canModerate,
      includeHidden: canModerate,
    }
  );

  return NextResponse.json(
    {
      success: true,
      data: {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          createdAt:
            item.createdAt instanceof Date
              ? item.createdAt.toISOString()
              : item.createdAt,
          editedAt:
            item.editedAt instanceof Date
              ? item.editedAt.toISOString()
              : item.editedAt ?? null,
        })),
        canModerate,
        canEdit: canModerate,
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const previewKey = previewWishWallKey(body.link, body.invitationId);
    if (previewKey) {
      if (!previewWishesEnabled()) {
        return NextResponse.json(
          { error: "Open a published guest invitation to leave a note." },
          { status: 403 }
        );
      }
      const wish = addPreviewWish(previewKey, {
        authorName: body.authorName,
        message: body.message,
      });
      return NextResponse.json(
        { success: true, data: wish },
        {
          status: 201,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        }
      );
    }

    const resolved = await resolveInviteAccess({
      eventId: body.eventId,
      link: body.link,
      invitationId: body.invitationId,
    });
    if (!resolved) {
      return NextResponse.json({ error: "Invalid event or invitation" }, { status: 400 });
    }

    if (resolved.invitationStatus === "EXPIRED") {
      return NextResponse.json({ error: "Invitation is no longer active" }, { status: 403 });
    }

    const invitationId =
      body.invitationId && !isPreviewInvitationId(body.invitationId)
        ? body.invitationId
        : resolved.invitationId;

    // Attribute ownership to the submitting invitation; public reads stay event-wide.
    const wish = await guestWishService.create({
      eventId: resolved.eventId,
      invitationId,
      guestId: body.guestId,
      authorName: body.authorName,
      message: body.message,
    });

    const { authorToken: _authorToken, ...publicWish } = wish;

    return NextResponse.json(
      { success: true, data: publicWish },
      {
        status: 201,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      }
    );
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
