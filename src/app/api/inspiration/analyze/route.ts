import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inspirationEngineService } from "@/services/inspiration/inspiration-engine.service";

const schema = z.object({
  url: z.string().url(),
  eventId: z.string().optional(),
  consentConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm ownership or permission." }),
  }),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const source = await inspirationEngineService.createFromUrl({
      userId: session.user.id,
      eventId: body.eventId,
      url: body.url,
      consentConfirmed: true,
    });
    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 400 }
    );
  }
}
