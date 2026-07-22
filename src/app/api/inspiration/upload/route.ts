import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inspirationEngineService } from "@/services/inspiration/inspiration-engine.service";
import { storeUploadFile } from "@/lib/uploads/file-storage";

const MAX_IMAGE = 25 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const MAX_AUDIO = 20 * 1024 * 1024;

const ALLOWED: Record<string, { ext: string; max: number; sourceType: "UPLOAD_IMAGE" | "UPLOAD_VIDEO" | "UPLOAD_AUDIO" }> = {
  "image/jpeg": { ext: ".jpg", max: MAX_IMAGE, sourceType: "UPLOAD_IMAGE" },
  "image/png": { ext: ".png", max: MAX_IMAGE, sourceType: "UPLOAD_IMAGE" },
  "image/webp": { ext: ".webp", max: MAX_IMAGE, sourceType: "UPLOAD_IMAGE" },
  "image/gif": { ext: ".gif", max: MAX_IMAGE, sourceType: "UPLOAD_IMAGE" },
  "image/svg+xml": { ext: ".svg", max: MAX_IMAGE, sourceType: "UPLOAD_IMAGE" },
  "application/pdf": { ext: ".pdf", max: MAX_IMAGE, sourceType: "UPLOAD_IMAGE" },
  "video/mp4": { ext: ".mp4", max: MAX_VIDEO, sourceType: "UPLOAD_VIDEO" },
  "video/webm": { ext: ".webm", max: MAX_VIDEO, sourceType: "UPLOAD_VIDEO" },
  "audio/mpeg": { ext: ".mp3", max: MAX_AUDIO, sourceType: "UPLOAD_AUDIO" },
  "audio/wav": { ext: ".wav", max: MAX_AUDIO, sourceType: "UPLOAD_AUDIO" },
  "audio/mp4": { ext: ".m4a", max: MAX_AUDIO, sourceType: "UPLOAD_AUDIO" },
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const consent = formData.get("consentConfirmed") === "true";
    const eventId = (formData.get("eventId") as string) || undefined;

    if (!consent) {
      return NextResponse.json({ error: "You must confirm ownership or permission." }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const config = ALLOWED[file.type];
    if (!config) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }
    if (file.size > config.max) {
      return NextResponse.json({ error: `File too large. Max ${Math.round(config.max / 1024 / 1024)}MB.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${config.ext}`;
    const { url } = await storeUploadFile("inspiration", session.user.id, safeName, buffer);

    let clientColors: { hex: string; weight: number }[] | undefined;
    const colorsRaw = formData.get("colors");
    if (typeof colorsRaw === "string") {
      try { clientColors = JSON.parse(colorsRaw); } catch { /* ignore */ }
    }

    const source = await inspirationEngineService.createFromUpload({
      userId: session.user.id,
      eventId,
      sourceType: config.sourceType,
      mediaUrl: url,
      mimeType: file.type,
      sizeBytes: file.size,
      consentConfirmed: true,
      clientColors,
      brightness: formData.get("brightness") ? parseFloat(String(formData.get("brightness"))) : undefined,
      aspectRatio: formData.get("aspectRatio") ? parseFloat(String(formData.get("aspectRatio"))) : undefined,
      fileName: file.name,
    });

    return NextResponse.json({ success: true, data: source }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}
