import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeGuestWrite,
  errorResponse,
  guardRate,
} from "@/lib/guest-search/api-auth";
import { DuplicateGuestError } from "@/lib/guest-search/duplicate-guests";
import { prisma } from "@/lib/prisma";
import {
  deleteGuest,
  updateGuestDetails,
} from "@/services/guests/guest-management.service";

/**
 * Organiser/admin guest detail mutations for the CRM guest list.
 *
 * DELETE is a soft archive (restoreable via invitation lifecycle / archived
 * search). Hard deletes are intentionally not offered once a guest may hold a
 * live link or QR.
 */

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    email: z.string().max(200).nullish(),
    phone: z.string().max(40).nullish(),
    plusOnes: z.number().int().min(0).max(50).optional(),
    notes: z.string().max(2000).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

async function loadGuestEvent(guestId: string) {
  return prisma.guest.findUnique({
    where: { id: guestId },
    select: { id: true, eventId: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const guest = await loadGuestEvent(id);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const auth = await authorizeGuestWrite(guest.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "guest-edit", 90, 60);
  if (limited) return limited;

  try {
    const updated = await updateGuestDetails({
      guestId: id,
      eventId: guest.eventId,
      actorUserId: auth.ctx.userId,
      ...parsed.data,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof DuplicateGuestError) {
      return NextResponse.json(
        { error: error.message, duplicates: error.duplicates, code: "DUPLICATE" },
        { status: 409 }
      );
    }
    return errorResponse(error, 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const guest = await loadGuestEvent(id);
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const auth = await authorizeGuestWrite(guest.eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "guest-delete", 60, 60);
  if (limited) return limited;

  let reason: string | undefined;
  try {
    const url = new URL(req.url);
    reason = url.searchParams.get("reason") ?? undefined;
    if (!reason) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object" && "reason" in body) {
        const value = (body as { reason?: unknown }).reason;
        reason = typeof value === "string" ? value : undefined;
      }
    }
  } catch {
    // Body is optional for DELETE.
  }

  try {
    const result = await deleteGuest({
      guestId: id,
      eventId: guest.eventId,
      actorUserId: auth.ctx.userId,
      reason,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
