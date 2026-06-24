import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";

const submitSchema = z.object({
  eventId: z.string(),
  userName: z.string().min(2),
  message: z.string().min(3),
  entryType: z.enum(["MESSAGE", "CONDOLENCE", "PRAYER", "SCRIPTURE"]).optional(),
  scriptureRef: z.string().optional(),
});

const moderateSchema = z.object({
  action: z.literal("moderate"),
  entryId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  const pending = new URL(req.url).searchParams.get("pending") === "1";
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (pending) {
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await verifyEventAccess(eventId, session.user.id, session.user.role);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const data = await funeralService.getGuestbook(eventId, pending);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  if (body.action === "moderate") {
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      const data = moderateSchema.parse(body);
      const entry = await funeralService.moderateGuestbook(data.entryId, data.status);
      return NextResponse.json({ success: true, data: entry });
    } catch {
      return NextResponse.json({ error: "Moderation failed" }, { status: 400 });
    }
  }

  try {
    const data = submitSchema.parse(body);
    const profile = await funeralService.getOrCreateProfile(data.eventId);
    if (profile.privacyStatus === "PRIVATE") {
      return NextResponse.json({ error: "Memorial is private" }, { status: 403 });
    }
    const entry = await funeralService.addGuestbookEntry(
      data.eventId,
      data.userName,
      data.message,
      data.entryType,
      data.scriptureRef
    );
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit guestbook entry" }, { status: 500 });
  }
}
