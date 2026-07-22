import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { inspirationOsService } from "@/services/invitation-os/inspiration-os.service";

const schema = z.object({
  orderId: z.string(),
  url: z.string().min(1).refine((u) => u.startsWith("/") || u.startsWith("http"), "Invalid media path"),
  type: z.enum(["image", "video", "pdf"]).default("image"),
  name: z.string().optional(),
  buildMode: z.enum(["template", "inspired", "similar", "improved"]).optional(),
  colors: z
    .array(z.object({ hex: z.string(), weight: z.number() }))
    .optional(),
  brightness: z.number().optional(),
  aspectRatio: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`inspiration:${session.user.id}`, 30, 3600);
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = schema.parse(await req.json());
    const result = await inspirationOsService.analyzeAndStore(body.orderId, session.user.id, {
      url: body.url,
      type: body.type,
      name: body.name,
      buildMode: body.buildMode,
      colors: body.colors,
      brightness: body.brightness,
      aspectRatio: body.aspectRatio,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 400 }
    );
  }
}
