import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { liveAlbumKey } from "@/lib/memory/live-album";
import { addLiveAlbumFile, listLiveAlbum } from "@/lib/memory/live-album-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: raw } = await params;
  const key = liveAlbumKey(raw);
  const items = await listLiveAlbum(key);
  return NextResponse.json({ success: true, data: { key, items } });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key: raw } = await params;
  const key = liveAlbumKey(raw);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = await rateLimit(`live-album:${ip}`, 40, 600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many uploads. Please wait a moment." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo or video from your lens." }, { status: 400 });
  }

  const guestName = typeof form?.get("guestName") === "string" ? String(form.get("guestName")) : "";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const item = await addLiveAlbumFile({
      key,
      buffer,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name || "memory",
      guestName,
    });
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that memory.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
