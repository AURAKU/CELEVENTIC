import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { flyerService } from "@/services/flyer/flyer.service";
import { parsePaginationFromUrl, PUBLIC_GRID_LIMIT } from "@/lib/pagination";

const createSchema = z.object({
  eventId: z.string().optional(),
  name: z.string().min(2),
  type: z.enum(["FLYER", "POSTER", "BANNER", "SOCIAL_MEDIA", "INVITATION_ANIMATED", "INVITATION_VIDEO"]),
  config: z.record(z.unknown()).optional(),
  templateId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId") ?? undefined;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });

  const [designs, templates] = await Promise.all([
    flyerService.getUserDesigns(session.user.id, eventId, page, limit),
    Promise.resolve(flyerService.getTemplates()),
  ]);

  return NextResponse.json({ success: true, data: { designs, templates } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    if (data.templateId) {
      const result = await flyerService.createFromTemplate({
        userId: session.user.id,
        templateId: data.templateId,
        eventId: data.eventId,
        name: data.name,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    const result = await flyerService.createBlank({
      userId: session.user.id,
      eventId: data.eventId,
      name: data.name,
      type: data.type,
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create design" }, { status: 500 });
  }
}
