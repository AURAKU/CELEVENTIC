import { NextResponse } from "next/server";
import { musicLibraryService } from "@/services/music/music-library.service";

/** Public list of admin-curated invitation music tracks */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const tracks = await musicLibraryService.listActive(category);
  return NextResponse.json({ success: true, data: tracks });
}
