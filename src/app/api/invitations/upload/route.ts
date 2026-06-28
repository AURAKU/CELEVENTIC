import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invitationInspirationService } from "@/services/invitations/invitation-inspiration.service";
import { getInvitationMediaLimits } from "@/lib/invitation/media-limits";
import { storeUploadFile } from "@/lib/uploads/file-storage";

const MAX_PDF = 15 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, { ext: string; max: number; mediaType: "image" | "video" | "pdf" }> = {
  "image/jpeg": { ext: ".jpg", max: 0, mediaType: "image" },
  "image/png": { ext: ".png", max: 0, mediaType: "image" },
  "image/webp": { ext: ".webp", max: 0, mediaType: "image" },
  "image/gif": { ext: ".gif", max: 0, mediaType: "image" },
  "image/jfif": { ext: ".jfif", max: 0, mediaType: "image" },
  "image/pjpeg": { ext: ".jpg", max: 0, mediaType: "image" },
  "video/mp4": { ext: ".mp4", max: 0, mediaType: "video" },
  "video/webm": { ext: ".webm", max: 0, mediaType: "video" },
  "application/pdf": { ext: ".pdf", max: MAX_PDF, mediaType: "pdf" },
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limits = await getInvitationMediaLimits();
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

    const maxBytes =
      config.mediaType === "video"
        ? limits.maxVideoBytes
        : config.mediaType === "image"
          ? limits.maxImageBytes
          : MAX_PDF;

    if (config.mediaType === "video" && role === "background" && !limits.allowVideoBackground) {
      return NextResponse.json({ error: "Video backgrounds are disabled for invitations." }, { status: 403 });
    }

    if (file.size > maxBytes) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(maxBytes / 1024 / 1024)}MB.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${config.ext}`;
    const { url } = await storeUploadFile("invitations", session.user.id, safeName, buffer);
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
