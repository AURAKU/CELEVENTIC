import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { aiInvitationCreatorService } from "@/services/invitation-os/ai-invitation-creator.service";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderId: z.string().optional(),
  eventType: z.string(),
  names: z.string().min(2),
  eventDate: z.string().optional(),
  venue: z.string().optional(),
  style: z.string().optional(),
  colors: z.string().optional(),
  story: z.string().optional(),
  language: z.enum(["en", "fr", "both"]).default("both"),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`ai-create:${session.user.id}`, 20, 3600);
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = schema.parse(await req.json());
    const content = await aiInvitationCreatorService.generate({
      eventType: body.eventType,
      names: body.names,
      eventDate: body.eventDate,
      venue: body.venue,
      style: body.style,
      colors: body.colors,
      story: body.story,
      language: body.language,
    });

    if (body.orderId) {
      await prisma.invitationOrder.updateMany({
        where: { id: body.orderId, userId: session.user.id },
        data: { aiGeneratedContent: content as object },
      });
    }

    return NextResponse.json({ success: true, data: content });
  } catch {
    return NextResponse.json({ error: "Experience generation failed" }, { status: 400 });
  }
}
