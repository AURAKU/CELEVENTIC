import { NextResponse } from "next/server";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { getServerAppUrl } from "@/lib/app-url";

function publicPayload(
  page: NonNullable<Awaited<ReturnType<typeof thankYouService.getPublishedByShareToken>>>,
  baseUrl: string,
  uploadToken: string | null
) {
  const formatted = thankYouService.formatPublicPage(page);
  return {
    page: {
      ...formatted,
      shareToken: page.shareToken,
    },
    event: {
      ...page.event,
      startDate: page.event.startDate,
    },
    uploadUrl: uploadToken ? `${baseUrl}/memory-upload/${uploadToken}` : undefined,
    memoriesUrl: `${baseUrl}/events/${page.event.slug}/memories`,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const page = await thankYouService.getPublishedByShareToken(token);
    if (!page) {
      return NextResponse.json(
        { error: "Thank-you page not found or not published" },
        { status: 404 }
      );
    }

    const baseUrl = await getServerAppUrl();
    let uploadToken: string | null = null;
    try {
      const created = await eventMemoryTokenService.getOrCreateUploadToken(page.eventId);
      uploadToken = created.token;
    } catch {
      uploadToken = null;
    }

    return NextResponse.json({
      success: true,
      data: publicPayload(page, baseUrl, uploadToken),
    });
  } catch (error) {
    console.error("[public/thank-you]", error);
    return NextResponse.json({ error: "Thank-you page unavailable" }, { status: 500 });
  }
}
