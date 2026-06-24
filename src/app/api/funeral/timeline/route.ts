import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";

const createSchema = z.object({
  eventId: z.string(),
  year: z.number().int(),
  title: z.string().min(1),
  description: z.string().optional(),
  mediaUrl: z.string().optional(),
  sortOrder: z.number().optional(),
});

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });
  const data = await funeralService.getTimeline(eventId);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    await verifyEventAccess(body.eventId, session.user.id, session.user.role);
    const entry = await funeralService.addTimelineEntry(body.eventId, body);
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add timeline entry" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const entry = await funeralService.deleteTimelineEntry(id);
  return NextResponse.json({ success: true, data: entry });
}
