import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";

const programSchema = z.object({
  eventId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  sortOrder: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (body.action === "delete") {
      const id = z.string().parse(body.id);
      const existing = await funeralService.getProgramItem(id);
      if (!existing) {
        return NextResponse.json({ error: "Program item not found" }, { status: 404 });
      }
      await verifyEventAccess(existing.eventId, session.user.id, session.user.role);
      const item = await funeralService.deleteProgramItem(id);
      return NextResponse.json({ success: true, data: item });
    }

    const data = programSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const item = await funeralService.addProgramItem(data);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Program operation failed" }, { status: 500 });
  }
}
