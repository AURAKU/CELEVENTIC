import { NextResponse } from "next/server";
import path from "path";
import { readUploadFile } from "@/lib/uploads/file-storage";
import { parseRange } from "@/lib/uploads/range";

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

/**
 * Serves uploaded media with HTTP Range support (206 Partial Content) — required for video
 * seeking / fast-start playback when a file is stored on local disk (S3/CloudFront already
 * support Range natively; this route is the local-storage fallback, see file-storage.ts).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join("/");
  const buffer = await readUploadFile(relative);
  if (!buffer) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(relative).toLowerCase();
  const contentType = resolveMime(relative, ext);
  const range = parseRange(req.headers.get("range"), buffer.length);

  if (range) {
    const chunk = buffer.subarray(range.start, range.end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${range.start}-${range.end}/${buffer.length}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Accept-Ranges": "bytes",
      "Content-Length": String(buffer.length),
    },
  });
}
