import { NextResponse } from "next/server";
import { open, stat } from "fs/promises";
import path from "path";
import { resolveUploadPath, getUploadRoot } from "@/lib/uploads/file-storage";
import { parseRange } from "@/lib/uploads/range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Local media delivery fallback.
 *
 * Production should serve `/uploads/` directly via Nginx (see docs/ops/nginx-uploads.conf).
 * This route exists for:
 *   - custom UPLOAD_DIR outside `public/uploads`
 *   - environments without the Nginx alias
 *   - Range probes / health checks
 *
 * Critical: never pipe media through Web TransformStreams / CompressionStream — that is the
 * historical source of `controller[kState].transformAlgorithm is not a function` under
 * mixed Node/undici stream implementations. We only return discrete Buffer/Uint8Array bodies
 * (range slices via `fs.open` + positional read), or a redirect to the static `/uploads/` path.
 */

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
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

function uploadRootIsPublicFolder(): boolean {
  const root = path.normalize(getUploadRoot());
  const publicUploads = path.normalize(path.join(process.cwd(), "public", "uploads"));
  return root === publicUploads;
}

function cacheHeaders(contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff",
    // Prevent Next/undici from attempting response compression transforms on media bytes.
    "Content-Encoding": "identity",
  };
}

async function readSlice(filePath: string, start: number, end: number): Promise<Uint8Array> {
  const length = end - start + 1;
  const fh = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buffer, 0, length, start);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
  } finally {
    await fh.close();
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.map((s) => decodeURIComponent(s)).join("/");

  // Prefer static Nginx / Next public delivery whenever the file lives under public/uploads.
  // Redirect avoids buffering large videos through the Node app (and TransformStream bugs).
  if (uploadRootIsPublicFolder() && process.env.MEDIA_FORCE_API_PROXY !== "1") {
    const target = new URL(`/uploads/${relative}`, req.url);
    // Preserve Range by using 307 so clients re-issue against Nginx/static.
    return NextResponse.redirect(target, 307);
  }

  let filePath: string;
  try {
    filePath = resolveUploadPath(relative);
  } catch {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (size <= 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 404 });
  }

  const ext = path.extname(relative).toLowerCase();
  const contentType = resolveMime(relative, ext);
  const range = parseRange(req.headers.get("range"), size);
  const headers = cacheHeaders(contentType);

  try {
    if (range) {
      const chunk = await readSlice(filePath, range.start, range.end);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
          "Content-Length": String(chunk.byteLength),
        },
      });
    }

    // Cap un-ranged full-body responses — browsers seeking video always send Range.
    // Large files without Range redirect to static when possible; otherwise refuse to
    // allocate multi-hundred-MB buffers in the Node process.
    const MAX_FULL_BODY = 32 * 1024 * 1024;
    if (size > MAX_FULL_BODY) {
      return new NextResponse("Range required for large media", {
        status: 416,
        headers: {
          ...headers,
          "Content-Range": `bytes */${size}`,
        },
      });
    }

    const body = await readSlice(filePath, 0, size - 1);
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...headers,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    console.error("[uploads] serve failed", {
      relative,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
