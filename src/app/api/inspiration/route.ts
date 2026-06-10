import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inspirationService } from "@/services/inspiration/inspiration.service";

const uploadSchema = z.object({
  eventId: z.string().optional(),
  type: z.enum(["IMAGE", "FLYER", "INVITATION", "BUSINESS_CARD", "VIDEO"]),
  url: z.string().url(),
});

const generateSchema = z.object({
  uploadId: z.string(),
  upgradeStyle: z.enum(["INSPIRED", "SIMILAR", "LUXURY", "IMPROVED", "MODERN", "TRADITIONAL_GHANAIAN"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uploads = await inspirationService.getUserUploads(session.user.id);
  return NextResponse.json({ success: true, data: uploads });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.action === "generate") {
      const data = generateSchema.parse(body);
      const upload = await inspirationService.getUpload(data.uploadId);
      if (!upload || upload.userId !== session.user.id) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }
      const result = await inspirationService.generate(data.uploadId, data.upgradeStyle);
      return NextResponse.json({ success: true, data: result });
    }

    const data = uploadSchema.parse(body);
    const upload = await inspirationService.upload({ ...data, userId: session.user.id });
    return NextResponse.json({ success: true, data: upload }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Inspiration operation failed" }, { status: 500 });
  }
}
