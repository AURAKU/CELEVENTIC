import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { designGeneratorService } from "@/services/template-engine/design-generator.service";
import { verifyEventAccess } from "@/lib/event-access";
import { templateMarketplaceService } from "@/services/template-engine/template-marketplace.service";

const schema = z.object({
  eventId: z.string(),
  templateId: z.string(),
  outputs: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);

    const hasAccess = await templateMarketplaceService.hasAccess(session.user.id, data.templateId);
    if (!hasAccess) return NextResponse.json({ error: "Premium template — purchase required" }, { status: 402 });

    const designs = await designGeneratorService.generateFromEvent({
      userId: session.user.id,
      eventId: data.eventId,
      templateId: data.templateId,
      outputs: data.outputs as never,
    });

    return NextResponse.json({ success: true, data: designs }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}
