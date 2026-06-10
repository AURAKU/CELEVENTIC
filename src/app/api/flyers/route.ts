import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { flyerService } from "@/services/flyer/flyer.service";

const createSchema = z.object({
  eventId: z.string().optional(),
  name: z.string().min(2),
  type: z.enum(["FLYER", "POSTER", "BANNER", "SOCIAL_MEDIA", "INVITATION_ANIMATED", "INVITATION_VIDEO"]),
  config: z.record(z.unknown()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [designs, templates] = await Promise.all([
    flyerService.getUserDesigns(session.user.id),
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
    const design = await flyerService.create({ ...data, userId: session.user.id, type: data.type });
    return NextResponse.json({ success: true, data: design }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create design" }, { status: 500 });
  }
}
