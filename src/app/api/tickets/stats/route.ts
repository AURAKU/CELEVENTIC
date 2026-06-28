import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ticketService } from "@/services/tickets/ticket.service";
import { verifyEventAccess } from "@/lib/event-access";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const stats = await ticketService.getEventStats(eventId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}
