import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inspirationEngineService } from "@/services/inspiration/inspiration-engine.service";

const schema = z.object({
  sourceId: z.string(),
  outputType: z.enum([
    "INVITATION",
    "TICKET",
    "FLYER",
    "THANK_YOU",
    "FUNERAL_MEMORIAL",
    "WEDDING",
    "BIRTHDAY",
    "CORPORATE",
    "CONCERT",
  ]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const result = await inspirationEngineService.generateTemplate(
      body.sourceId,
      session.user.id,
      body.outputType
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 400 }
    );
  }
}
