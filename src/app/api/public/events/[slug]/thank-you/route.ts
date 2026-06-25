import { NextResponse } from "next/server";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { getServerAppUrl } from "@/lib/app-url";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await thankYouService.getPublishedBySlug(slug);
  if (!page) {
    return NextResponse.json({ error: "Thank-you page not found or not published" }, { status: 404 });
  }

  const uploadToken = await eventMemoryTokenService.getOrCreateUploadToken(page.eventId);
  const baseUrl = await getServerAppUrl();

  return NextResponse.json({
    success: true,
    data: {
      page: {
        title: page.title,
        message: page.message,
        flyerUrl: page.flyerUrl,
        hostPhotoUrl: page.hostPhotoUrl,
        audioUrl: page.audioUrl,
        template: page.template,
      },
      event: page.event,
      uploadUrl: `${baseUrl}/memory-upload/${uploadToken.token}`,
      memoriesUrl: `${baseUrl}/events/${slug}/memories`,
    },
  });
}
