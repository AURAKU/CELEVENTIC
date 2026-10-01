import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  deleteUploadFile,
  getUploadRoot,
  readUploadFile,
  storeUploadFile,
} from "@/lib/uploads/file-storage";
import { validateMemoryFile } from "@/lib/memory/memory-upload-storage";
import { liveAlbumKey, type LiveAlbumItem } from "@/lib/memory/live-album";

const MAX_ITEMS = 80;
const MANIFEST_NAME = "manifest.json";

function manifestRelativePath(key: string) {
  return `memory-live/${liveAlbumKey(key)}/${MANIFEST_NAME}`;
}

function localManifestPath(key: string) {
  return path.join(getUploadRoot(), "memory-live", liveAlbumKey(key), MANIFEST_NAME);
}

function parseItems(raw: string): LiveAlbumItem[] {
  try {
    const parsed = JSON.parse(raw) as { items?: LiveAlbumItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function readManifest(key: string): Promise<LiveAlbumItem[]> {
  const relative = manifestRelativePath(key);
  const stored = await readUploadFile(relative);
  if (stored) return parseItems(stored.toString("utf8"));
  try {
    return parseItems(await readFile(localManifestPath(key), "utf8"));
  } catch {
    return [];
  }
}

async function writeManifest(key: string, items: LiveAlbumItem[]) {
  const payload = Buffer.from(JSON.stringify({ items }, null, 2), "utf8");
  await storeUploadFile("memory-live", liveAlbumKey(key), MANIFEST_NAME, payload);
  try {
    const file = localManifestPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, payload);
  } catch {
    /* Local mirror is optional when S3 is the live backend. */
  }
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

export async function removeLiveAlbumItem(key: string, itemId: string): Promise<LiveAlbumItem> {
  const albumKey = liveAlbumKey(key);
  const id = itemId.trim();
  if (!id) throw new Error("Memory not found");
  const items = await readManifest(albumKey);
  const item = items.find((entry) => entry.id === id);
  if (!item) throw new Error("Memory not found");
  await deleteUploadFile(item.relativePath);
  await writeManifest(
    albumKey,
    items.filter((entry) => entry.id !== id)
  );
  return item;
}
