import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";

const colorSampleSchema = z.object({
  hex: z.string(),
  weight: z.number(),
});

const analyzeSchema = z.object({
  url: z.string(),
  type: z.enum(["image", "video", "pdf"]),
  name: z.string().optional(),
  buildMode: z.enum(["template", "inspired", "similar", "improved"]).optional(),
  colors: z.array(colorSampleSchema).optional(),
  brightness: z.number().optional(),
  aspectRatio: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = analyzeSchema.parse(body);
    const analysis = invitationInspirationService.analyze(data);
    return NextResponse.json({ success: true, data: analysis });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
