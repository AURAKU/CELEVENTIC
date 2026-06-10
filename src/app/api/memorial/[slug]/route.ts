import { NextResponse } from "next/server";
import { funeralService } from "@/services/funeral/funeral.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const memorial = await funeralService.getMemorialPage(slug);

  if (!memorial) {
    return NextResponse.json({ error: "Memorial not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      eventId: memorial.id,
      slug: memorial.slug,
      title: memorial.title,
      startDate: memorial.startDate,
      venueName: memorial.venueName,
      mapsLink: memorial.mapsLink,
      profile: memorial.funeralProfile,
      program: memorial.funeralPrograms,
      tributes: memorial.tributeMessages,
      contributions: memorial.contributions.map((c) => ({
        contributor: c.contributor,
        amount: Number(c.amount),
        currency: c.currency,
        message: c.message,
        createdAt: c.createdAt,
      })),
    },
  });
}
