import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invitationService } from "@/services/invitations/invitation.service";
import { parsePaginationFromUrl, DEFAULT_LIMIT } from "@/lib/pagination";
import { verifyEventAccess } from "@/lib/event-access";

const designConfigSchema = z.object({
  layout: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    text: z.string(),
  }),
  media: z.array(z.object({
    url: z.string(),
    type: z.enum(["image", "video", "pdf"]),
    role: z.enum(["hero", "background", "reference", "attachment", "intro"]),
    name: z.string().optional(),
  })).optional(),
  animation: z.enum(["fade", "parallax", "ken-burns", "none"]).optional(),
  introText: z.string().optional(),
  buildMode: z.enum(["template", "inspired", "similar", "improved"]).optional(),
}).passthrough();

const createSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  name: z.string().min(2, "Invitation name must be at least 2 characters"),
  templateId: z.string().optional(),
  message: z.string().optional(),
  designConfig: designConfigSchema.optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const { page, limit } = parsePaginationFromUrl(req.url, { limit: DEFAULT_LIMIT });
    const invitations = await invitationService.getEventInvitations(eventId, page, limit);
    return NextResponse.json({ success: true, data: invitations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load invitations" },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    await verifyEventAccess(data.eventId, session.user.id, session.user.role);

    const invitation = await invitationService.createInvitation({
      eventId: data.eventId,
      name: data.name,
      message: data.message,
      templateId: data.templateId,
      designConfig: data.designConfig as never,
    });

    return NextResponse.json({ success: true, data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create invitation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invitation" },
      { status: 500 }
    );
  }
}
