import { NextResponse } from "next/server";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { getServerAppUrl } from "@/lib/app-url";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await thankYouService.getPublishedBySlug(slug);
    if (!page) {
      return NextResponse.json(
        { error: "Thank-you page not found or not published" },
        { status: 404 }
      );
    }

    const baseUrl = await getServerAppUrl();
    const formatted = thankYouService.formatPublicPage(page);
    if (!formatted) {
      return NextResponse.json(
        { error: "Thank-you page not found or not published" },
        { status: 404 }
      );
    }

    let uploadUrl: string | undefined;
    try {
      const uploadToken = await eventMemoryTokenService.getOrCreateUploadToken(page.eventId);
      uploadUrl = `${baseUrl}/memory-upload/${uploadToken.token}`;
    } catch {
      uploadUrl = undefined;
    }

    return NextResponse.json({
      success: true,
      data: {
        page: {
          ...formatted,
          shareToken: page.shareToken,
        },
        event: page.event,
        uploadUrl,
        memoriesUrl: `${baseUrl}/events/${slug}/memories`,
      },
    });
  } catch (error) {
    console.error("[public/events/thank-you]", error);
    return NextResponse.json({ error: "Thank-you page unavailable" }, { status: 500 });
  }
}
