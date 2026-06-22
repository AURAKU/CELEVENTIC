import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const MAX_PDF = 15 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, { ext: string; max: number; mediaType: "image" | "video" | "pdf" }> = {
  "image/jpeg": { ext: ".jpg", max: MAX_IMAGE, mediaType: "image" },
  "image/png": { ext: ".png", max: MAX_IMAGE, mediaType: "image" },
  "image/webp": { ext: ".webp", max: MAX_IMAGE, mediaType: "image" },
  "image/gif": { ext: ".gif", max: MAX_IMAGE, mediaType: "image" },
  "image/jfif": { ext: ".jfif", max: MAX_IMAGE, mediaType: "image" },
  "image/pjpeg": { ext: ".jpg", max: MAX_IMAGE, mediaType: "image" },
  "video/mp4": { ext: ".mp4", max: MAX_VIDEO, mediaType: "video" },
  "video/webm": { ext: ".webm", max: MAX_VIDEO, mediaType: "video" },
  "application/pdf": { ext: ".pdf", max: MAX_PDF, mediaType: "pdf" },
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const role = (formData.get("role") as string) || "hero";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const config = ALLOWED_TYPES[file.type];
    if (!config) {
      return NextResponse.json({ error: "Unsupported file type. Use JPG, PNG, WebP, MP4, WebM, or PDF." }, { status: 400 });
    }

    if (file.size > config.max) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(config.max / 1024 / 1024)}MB.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${config.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "invitations", session.user.id);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    const url = `/uploads/invitations/${session.user.id}/${safeName}`;
    const buildMode = (formData.get("buildMode") as string) || "inspired";
    const clientColors = formData.get("colors");
    const clientBrightness = formData.get("brightness");
    const clientAspectRatio = formData.get("aspectRatio");

    let parsedColors: { hex: string; weight: number }[] | undefined;
    if (typeof clientColors === "string") {
      try { parsedColors = JSON.parse(clientColors); } catch { /* ignore */ }
    }

    const analysis = invitationInspirationService.analyze({
      url,
      type: config.mediaType,
      name: file.name,
      buildMode: buildMode as "inspired" | "similar" | "improved" | "template",
      colors: parsedColors,
      brightness: clientBrightness ? parseFloat(String(clientBrightness)) : undefined,
      aspectRatio: clientAspectRatio ? parseFloat(String(clientAspectRatio)) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        url,
        type: config.mediaType,
        role,
        name: file.name,
        size: file.size,
        analysis,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
