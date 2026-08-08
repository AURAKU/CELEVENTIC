import { NextResponse } from "next/server";
import { z } from "zod";
import { funeralService } from "@/services/funeral/funeral.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

const schema = z.object({
  eventId: z.string(),
  userName: z.string().min(2),
  message: z.string().optional(),
  country: z.string().optional(),
});

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await funeralService.getCandles(eventId, page, limit);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const event = await funeralService.getOrCreateProfile(body.eventId);
    if (event.privacyStatus === "PRIVATE") {
      return NextResponse.json({ error: "Memorial is private" }, { status: 403 });
    }
    const candle = await funeralService.lightCandle(
      body.eventId,
      body.userName,
      body.message,
      body.country
    );
    return NextResponse.json({ success: true, data: candle }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to light candle" }, { status: 500 });
  }
}
