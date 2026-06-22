import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { thankYouService } from "@/services/thank-you/thank-you.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const body = await req.json().catch(() => ({}));
    const page = body.unpublish
      ? await thankYouService.unpublish(eventId)
      : await thankYouService.publish(eventId);
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to publish" }, { status: 500 });
  }
}
