import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { getServerAppUrl } from "@/lib/app-url";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const tokenRecord = await eventMemoryTokenService.getOrCreateViewToken(eventId);
    const baseUrl = await getServerAppUrl();
    const galleryUrl = `${baseUrl}/memory/${tokenRecord.token}`;

    return NextResponse.json({
      success: true,
      data: {
        token: tokenRecord.token,
        galleryUrl,
        qrImageUrl: `/api/qr/image?data=${encodeURIComponent(galleryUrl)}&eventId=${eventId}&size=512`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}
