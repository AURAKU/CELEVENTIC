import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveMusicUpload } from "@/lib/music/music-constants";
import { storeUploadFile } from "@/lib/uploads/file-storage";

/** User upload for custom invitation music (trim on client, validate on order save) */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || file?.name?.replace(/\.[^.]+$/, "") || "Custom track";
    const durationSecRaw = formData.get("durationSec");
    const durationSec =
      typeof durationSecRaw === "string" ? parseFloat(durationSecRaw) : undefined;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const config = resolveMusicUpload(file);
    if (!config) {
      return NextResponse.json(
        { error: "Unsupported audio format. Use MP3, WAV, M4A, AAC, OGG, FLAC, WebM, or other common audio files." },
        { status: 400 }
      );
    }

    if (file.size > config.max) {
      return NextResponse.json({ error: "File too large. Maximum 25MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${config.ext}`;
    const { url } = await storeUploadFile("music", session.user.id, safeName, buffer);

    return NextResponse.json({
      success: true,
      data: {
        url,
        title,
        durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
      },
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
