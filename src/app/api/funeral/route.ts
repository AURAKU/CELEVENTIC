import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { funeralService } from "@/services/funeral/funeral.service";
import { verifyEventAccess } from "@/lib/event-access";

const profileSchema = z.object({
  eventId: z.string(),
  deceasedName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  dateOfPassing: z.string().optional(),
  age: z.number().optional(),
  biography: z.string().optional(),
  familyName: z.string().optional(),
  familyInformation: z.string().optional(),
  lifeJourney: z.string().optional(),
  achievements: z.string().optional(),
  education: z.string().optional(),
  career: z.string().optional(),
  faithJourney: z.string().optional(),
  legacyMessage: z.string().optional(),
  photoUrl: z.string().optional(),
  theme: z.string().optional(),
  templateSlug: z.string().optional(),
  revealStyle: z.string().optional(),
  invitationAudioCategory: z.string().optional(),
  privacyStatus: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]).optional(),
  burialVenue: z.string().optional(),
  burialDirections: z.string().optional(),
  livestreamUrl: z.string().optional(),
  familyContacts: z.unknown().optional(),
  preferredLanguages: z.unknown().optional(),
  legacyVisibility: z.enum(["PUBLIC", "PRIVATE", "FAMILY_ONLY"]).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const data = await funeralService.getDashboardData(eventId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = profileSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const profile = await funeralService.updateProfile(data.eventId, data);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save funeral profile" }, { status: 500 });
  }
}
