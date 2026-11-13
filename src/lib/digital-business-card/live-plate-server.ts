import { celeCardLivePlateSnapshotKey } from "@/lib/digital-business-card/live-plate";
import { readUploadFile } from "@/lib/uploads/file-storage";

export async function readLivePlateSnapshotPng(cardId: string): Promise<Buffer | null> {
  const key = celeCardLivePlateSnapshotKey(cardId);
  if (!key) return null;
  try {
    const buffer = await readUploadFile(key);
    if (!buffer || buffer.length < 64 || buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;
    return buffer;
  } catch {
    return null;
  }
}

export async function livePlateSnapshotResponse(cardId: string, cacheControl: string): Promise<Response | null> {
  const buffer = await readLivePlateSnapshotPng(cardId);
  if (!buffer) return null;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl,
    },
  });
}
