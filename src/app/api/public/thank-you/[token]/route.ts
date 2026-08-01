import { NextResponse } from "next/server";
import { thankYouService } from "@/services/thank-you/thank-you.service";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { getServerAppUrl } from "@/lib/app-url";

function publicPayload(
  page: NonNullable<Awaited<ReturnType<typeof thankYouService.getPublishedByShareToken>>>,
  baseUrl: string,
  uploadToken: string
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
    uploadUrl: `${baseUrl}/memory-upload/${uploadToken}`,
    memoriesUrl: `${baseUrl}/events/${page.event.slug}/memories`,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const page = await thankYouService.getPublishedByShareToken(token);
  if (!page) {
    return NextResponse.json({ error: "Thank-you page not found or not published" }, { status: 404 });
  }

  const uploadToken = await eventMemoryTokenService.getOrCreateUploadToken(page.eventId);
  const baseUrl = await getServerAppUrl();

  return NextResponse.json({
    success: true,
    data: publicPayload(page, baseUrl, uploadToken.token),
  });
}
