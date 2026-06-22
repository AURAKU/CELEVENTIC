import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assetLibraryService } from "@/services/template-engine/asset-library.service";
import type { AssetLibraryType } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as AssetLibraryType | null;
  const category = searchParams.get("category") ?? undefined;
  const resource = searchParams.get("resource");

  if (resource === "fonts") {
    const fonts = await assetLibraryService.listFonts();
    return NextResponse.json({ success: true, data: fonts });
  }

  if (resource === "palettes") {
    const palettes = await assetLibraryService.listPalettes(category);
    return NextResponse.json({ success: true, data: palettes });
  }

  if (resource === "patterns") {
    const patterns = await assetLibraryService.listPatterns(category);
    return NextResponse.json({ success: true, data: patterns });
  }

  const assets = await assetLibraryService.list({ type: type ?? undefined, category });
  return NextResponse.json({ success: true, data: assets });
}
