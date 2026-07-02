import { NextResponse } from "next/server";
import { getAudioTracksByCategory, getCatalogLibraryTracks } from "@/lib/music/audio-experience-catalog";
import { musicLibraryService } from "@/services/music/music-library.service";

/** Public list of invitation music tracks (bundled catalog + admin/user uploads). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;

  const dbTracks = await musicLibraryService.listActive(category === "general" ? undefined : category);
  const catalogTracks =
    category && category !== "general" && category !== "all"
      ? getAudioTracksByCategory(category)
      : getCatalogLibraryTracks();

  const seen = new Set<string>();
  const merged = [...catalogTracks, ...dbTracks].filter((t) => {
    const key = t.url || t.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ success: true, data: merged });
}
