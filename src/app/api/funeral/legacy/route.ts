import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";

const schema = z.object({
  eventId: z.string(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "FAMILY_ONLY"]).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    await verifyEventAccess(body.eventId, session.user.id, session.user.role);
    const archive = await funeralService.publishLegacyArchive(body.eventId, body.visibility);
    return NextResponse.json({ success: true, data: archive });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to publish legacy archive" }, { status: 500 });
  }
}
