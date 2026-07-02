import { NextResponse } from "next/server";
import path from "path";
import { readUploadFile } from "@/lib/uploads/file-storage";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
};

function resolveMime(relative: string, ext: string): string {
  if (ext === ".webm" && relative.startsWith("music/")) return "audio/webm";
  return MIME[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join("/");
  const buffer = await readUploadFile(relative);
  if (!buffer) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(relative).toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": resolveMime(relative, ext),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
