import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contributionService } from "@/services/contributions/contribution.service";
import { verifyEventAccess } from "@/lib/event-access";

const contributeSchema = z.object({
  eventId: z.string(),
  contributor: z.string().min(2),
  amount: z.number().positive(),
  message: z.string().optional(),
  isAnonymous: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const stats = await contributionService.getContributionStats(eventId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Access denied" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = contributeSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    const contribution = await contributionService.contribute(data);
    return NextResponse.json({ success: true, data: contribution }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Contribution failed" }, { status: 500 });
  }
}
