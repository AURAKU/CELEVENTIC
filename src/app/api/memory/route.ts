import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { memoryService } from "@/services/memory/memory.service";
import { verifyEventAccess } from "@/lib/event-access";

const createSchema = z.object({
  eventId: z.string(),
  type: z.enum(["photo", "video", "guestbook", "tribute", "highlight"]),
  url: z.string().optional(),
  content: z.string().optional(),
  author: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const type = new URL(req.url).searchParams.get("type") ?? undefined;
    const [memories, summary] = await Promise.all([
      memoryService.getEventMemories(eventId, type),
      memoryService.getVaultSummary(eventId),
    ]);
    return NextResponse.json({ success: true, data: { memories, summary } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const memory = await memoryService.create({
      ...data,
      author: data.author ?? session.user.name ?? undefined,
    });
    return NextResponse.json({ success: true, data: memory }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
  }
}
