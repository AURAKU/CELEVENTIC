import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;
  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const page = await thankYouService.ensureShareToken(eventId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://celeventic.com";
    const uploadToken = await eventMemoryTokenService.getOrCreateUploadToken(eventId);

    return NextResponse.json({
      success: true,
      data: {
        thankYouUrl: `${baseUrl}/thank-you/${page.shareToken}`,
        slugUrl: page.event ? `${baseUrl}/events/${page.event.slug}/thank-you` : null,
        uploadUrl: `${baseUrl}/memory-upload/${uploadToken.token}`,
        shareToken: page.shareToken,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
