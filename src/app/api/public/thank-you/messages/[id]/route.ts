import { NextResponse } from "next/server";
import { z } from "zod";
import {
  guestWishService,
  authorTokenMatches,
} from "@/services/invitations/guest-wish.service";
import { resolveWishCapabilities } from "@/lib/invitation/guest-wish-permissions";
import { rateLimit } from "@/lib/rate-limit";

const patchSchema = z
  .object({
    authorToken: z.string().min(10),
    authorName: z.string().min(1).max(80).optional(),
    message: z.string().min(2).max(1000).optional(),
    title: z.string().max(120).nullable().optional(),
    avatarUrl: z.string().max(500).nullable().optional(),
    isAnonymous: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.authorName !== undefined ||
      value.message !== undefined ||
      value.title !== undefined ||
      value.avatarUrl !== undefined ||
      value.isAnonymous !== undefined,
    { message: "Nothing to update" }
  );

const deleteSchema = z.object({
  authorToken: z.string().min(10),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = patchSchema.parse(await req.json());
    const limited = await rateLimit(`thank-you-message-edit:${body.authorToken.slice(0, 12)}`, 20, 60);
    if (!limited.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const wish = await guestWishService.getById(id);
    if (!wish || wish.source !== "THANK_YOU_PAGE") {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const caps = resolveWishCapabilities({
      isModerator: false,
      hasValidAuthorToken: authorTokenMatches(wish.authorTokenHash, body.authorToken),
      allowAuthorSelfManage: true,
    });
    if (!caps.canEdit) {
      return NextResponse.json(
        { error: "You can only edit your own message" },
        { status: 403 }
      );
    }

    const updated = await guestWishService.update(
      id,
      {
        authorName: body.authorName,
        message: body.message,
        title: body.title,
        avatarUrl: body.avatarUrl,
        isAnonymous: body.isAnonymous,
      },
      { markEdited: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = deleteSchema.parse(await req.json());
    const wish = await guestWishService.getById(id);
    if (!wish || wish.source !== "THANK_YOU_PAGE") {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const caps = resolveWishCapabilities({
      isModerator: false,
      hasValidAuthorToken: authorTokenMatches(wish.authorTokenHash, body.authorToken),
      allowAuthorSelfManage: true,
    });
    if (!caps.canDelete) {
      return NextResponse.json(
        { error: "You can only delete your own message" },
        { status: 403 }
      );
    }

    await guestWishService.softRemove(id);
    return NextResponse.json({ success: true, data: { id, deletedBy: "author" } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 400 }
    );
  }
}
