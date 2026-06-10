import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiTemplateGeneratorService } from "@/services/template-engine/ai-template-generator.service";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  prompt: z.string().min(10).max(2000),
  eventId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimit(`ai-design:${session.user.id}`, 10, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again shortly." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const result = await aiTemplateGeneratorService.generate({
      userId: session.user.id,
      eventId: data.eventId,
      prompt: data.prompt,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI generation failed" }, { status: 500 });
  }
}
