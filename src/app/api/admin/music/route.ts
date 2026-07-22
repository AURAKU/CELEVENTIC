import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { musicLibraryService } from "@/services/music/music-library.service";
import { resolveMusicUpload } from "@/lib/music/music-constants";
import { storeUploadFile } from "@/lib/uploads/file-storage";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  artist: z.string().nullable().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  sortOrder: z.number().optional(),
  durationSec: z.number().optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await musicLibraryService.listAdmin(req.url);
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string)?.trim();
    const artist = (formData.get("artist") as string)?.trim() || undefined;
    const category = (formData.get("category") as string) || "general";
    const durationSecRaw = formData.get("durationSec");
    const durationSec =
      typeof durationSecRaw === "string" ? parseFloat(durationSecRaw) : undefined;
    const clipStartRaw = formData.get("clipStartSec");
    const clipEndRaw = formData.get("clipEndSec");
    const clipStartSec =
      typeof clipStartRaw === "string" ? parseFloat(clipStartRaw) : undefined;
    const clipEndSec = typeof clipEndRaw === "string" ? parseFloat(clipEndRaw) : undefined;
    const sourceUrl = (formData.get("sourceUrl") as string)?.trim() || undefined;

    if (!file || !title) {
      return NextResponse.json({ error: "Title and audio file are required" }, { status: 400 });
    }

    const config = resolveMusicUpload(file);
    if (!config) {
      return NextResponse.json(
        { error: "Unsupported media. Upload an audio file the browser can play (mp3, wav, m4a, ogg, flac, …)." },
        { status: 400 }
      );
    }
    if (file.size > config.max) {
      return NextResponse.json({ error: "File too large (max 40MB)" }, { status: 400 });
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${config.ext}`;
    const { url } = await storeUploadFile("music", "library", safeName, Buffer.from(await file.arrayBuffer()));

    const track = await musicLibraryService.createTrack({
      title,
      artist,
      category,
      url,
      sourceUrl,
      durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
      clipStartSec: Number.isFinite(clipStartSec) ? clipStartSec : undefined,
      clipEndSec: Number.isFinite(clipEndSec) ? clipEndSec : undefined,
      createdById: session.user.id,
    });

    return NextResponse.json({ success: true, data: track });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body as { id?: string };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const parsed = patchSchema.parse(data);
    const track = await musicLibraryService.updateTrack(id, parsed);
    return NextResponse.json({ success: true, data: track });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
