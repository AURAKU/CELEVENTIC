import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { venueService } from "@/services/venues/venue.service";
import { parsePaginationFromUrl, PUBLIC_GRID_LIMIT } from "@/lib/pagination";

const bookingSchema = z.object({
  venueId: z.string(),
  eventDate: z.string(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const venueId = params.get("id");

  if (venueId && params.get("availability")) {
    const month = parseInt(params.get("month") ?? "1");
    const year = parseInt(params.get("year") ?? new Date().getFullYear().toString());
    const dates = await venueService.getAvailability(venueId, month, year);
    return NextResponse.json({ success: true, data: dates });
  }

  if (venueId) {
    const venue = await venueService.getById(venueId);
    return NextResponse.json({ success: true, data: venue });
  }

  const { page, limit } = parsePaginationFromUrl(req.url, { limit: PUBLIC_GRID_LIMIT });
  const venues = await venueService.list({
    capacity: params.get("capacity") ? parseInt(params.get("capacity")!) : undefined,
    location: params.get("location") ?? undefined,
    page,
    limit,
  });
  return NextResponse.json({ success: true, data: venues });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);
    const booking = await venueService.requestBooking(
      data.venueId,
      session.user.id,
      new Date(data.eventDate),
      data.notes
    );
    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Booking failed" }, { status: 500 });
  }
}
