import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationOrderService } from "@/services/invitations/invitation-order.service";
import { validateMusicSelection } from "@/lib/music/validate-selection";

const musicSelectionSchema = z
  .object({
    source: z.enum(["library", "upload"]),
    libraryTrackId: z.string().optional(),
    url: z.string().min(1),
    title: z.string().optional(),
    startSec: z.number().min(0),
    endSec: z.number().positive(),
    originalDurationSec: z.number().optional(),
  })
  .nullable()
  .optional();

const updateSchema = z.object({
  hostName: z.string().optional(),
  coupleName1: z.string().optional(),
  coupleName2: z.string().optional(),
  deceasedName: z.string().optional(),
  eventTitle: z.string().optional(),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  venueName: z.string().optional(),
  landmark: z.string().optional(),
  mapsLink: z.string().optional(),
  dressCode: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  story: z.string().optional(),
  galleryUrls: z.array(z.string()).optional(),
  musicPreference: z.string().optional(),
  musicSelection: musicSelectionSchema,
  rsvpRequired: z.boolean().optional(),
  guestCount: z.number().optional(),
  addonSlugs: z.array(z.string()).optional(),
  designConfig: z.record(z.unknown()).optional(),
  languageMode: z.enum(["EN_ONLY", "FR_ONLY", "EN_FR"]).optional(),
  eventTitleFr: z.string().optional(),
  storyFr: z.string().optional(),
  status: z.string().optional(),
  productionStatus: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const order = await invitationOrderService.getOrderForUser(id, session.user.id);
    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.musicSelection) {
      const err = validateMusicSelection(data.musicSelection);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    if (data.status || data.productionStatus) {
      if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { prisma } = await import("@/lib/prisma");
      const order = await prisma.invitationOrder.update({
        where: { id },
        data: {
          ...(data.status ? { status: data.status as never } : {}),
          ...(data.productionStatus ? { productionStatus: data.productionStatus as never } : {}),
        },
      });
      return NextResponse.json({ success: true, data: order });
    }

    const order = await invitationOrderService.updateOrder(id, session.user.id, data);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
