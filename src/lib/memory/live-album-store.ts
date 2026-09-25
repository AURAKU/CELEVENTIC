import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { storeUploadFile, getUploadRoot } from "@/lib/uploads/file-storage";
import { validateMemoryFile } from "@/lib/memory/memory-upload-storage";
import { liveAlbumKey, type LiveAlbumItem } from "@/lib/memory/live-album";

const MAX_ITEMS = 80;

function manifestPath(key: string) {
  return path.join(getUploadRoot(), "memory-live", liveAlbumKey(key), "manifest.json");
}

async function readManifest(key: string): Promise<LiveAlbumItem[]> {
  try {
    const raw = await readFile(manifestPath(key), "utf8");
    const parsed = JSON.parse(raw) as { items?: LiveAlbumItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeManifest(key: string, items: LiveAlbumItem[]) {
  const file = manifestPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ items }, null, 2), "utf8");
}

export async function listLiveAlbum(key: string): Promise<LiveAlbumItem[]> {
  return readManifest(liveAlbumKey(key));
}

export async function addLiveAlbumFile(input: {
  key: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  guestName?: string;
}): Promise<LiveAlbumItem> {
  const key = liveAlbumKey(input.key);
  const check = validateMemoryFile(input.mimeType, input.buffer.length, 12, 40, input.fileName);
  if (!check.valid || !check.mediaType) {
    throw new Error(check.reason || "That file cannot be added to the album.");
  }

  const items = await readManifest(key);
  if (items.length >= MAX_ITEMS) {
    throw new Error("This album is full. Please view the album and try again later.");
  }

  const id = crypto.randomUUID();
  const safeName = `${id}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "").slice(-80) || "memory"}`;
  const stored = await storeUploadFile("memory-live", key, safeName, input.buffer);
  const item: LiveAlbumItem = {
    id,
    url: stored.url,
    relativePath: stored.relativePath,
    mediaType: check.mediaType,
    createdAt: new Date().toISOString(),
    guestName: input.guestName?.trim().slice(0, 80) || undefined,
  };
  items.unshift(item);
  await writeManifest(key, items);
  return item;
}
