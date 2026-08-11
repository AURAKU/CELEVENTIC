import { NextResponse } from "next/server";
import { z } from "zod";
import { eventMemoryTokenService } from "@/services/memory/event-memory-token.service";
import { eventMemorySocialService } from "@/services/memory/event-memory-social.service";

const bodySchema = z.object({
  guestKey: z.string().min(8).max(200),
  consent: z.literal(true),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await eventMemoryTokenService.resolveToken(token);
  if (!record || record.type !== "UPLOAD") {
    return NextResponse.json({ error: "Invalid or expired upload link" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "guestKey and consent required" }, { status: 400 });
  }

  const guestKeyHash = eventMemorySocialService.resolveGuestKeyHash(parsed.data.guestKey);
  if (!guestKeyHash) {
    return NextResponse.json({ error: "Invalid guest key" }, { status: 400 });
  }

  await eventMemorySocialService.recordConsent({
    eventId: record.eventId,
    guestKeyHash,
  });

  return NextResponse.json({ success: true, data: { hasConsent: true } });
}
