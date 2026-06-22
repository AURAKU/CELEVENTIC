import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemorySettingsService } from "@/services/memory/event-memory-settings.service";

const updateSchema = z.object({
  maxPhotosPerGuest: z.number().int().min(0).max(100).optional(),
  maxVideosPerGuest: z.number().int().min(0).max(50).optional(),
  maxImageSizeMb: z.number().int().min(1).max(500).optional(),
  maxVideoSizeMb: z.number().int().min(1).max(2000).optional(),
  uploadWindowStart: z.string().nullable().optional(),
  uploadWindowEnd: z.string().nullable().optional(),
  approvalRequired: z.boolean().optional(),
  guestOnlyMode: z.boolean().optional(),
  allowAnonymousUploads: z.boolean().optional(),
  allowDownloads: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const settings = await eventMemorySettingsService.get(eventId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const data = updateSchema.parse(await req.json());
    const settings = await eventMemorySettingsService.update(eventId, data);
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update settings" }, { status: 500 });
  }
}
