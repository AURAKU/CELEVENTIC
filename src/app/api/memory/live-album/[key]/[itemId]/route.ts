import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { liveAlbumKey } from "@/lib/memory/live-album";
import { canRemoveLiveAlbumMedia } from "@/lib/memory/live-album-access";
import { removeLiveAlbumItem } from "@/lib/memory/live-album-store";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ key: string; itemId: string }> }
) {
  const { key: raw, itemId } = await params;
  const key = liveAlbumKey(raw);
  const session = await getServerSession(authOptions).catch(() => null);
  const allowed = await canRemoveLiveAlbumMedia(key, session?.user?.id, session?.user?.role);
  if (!allowed) {
    return NextResponse.json(
      { error: "Only an admin or the organizer can remove photos from this album." },
      { status: 403 }
    );
  }

  try {
    const item = await removeLiveAlbumItem(key, itemId);
    return NextResponse.json({ success: true, data: { id: item.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove that memory.";
    const status = message === "Memory not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
