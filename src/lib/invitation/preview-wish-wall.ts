import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";

export type PreviewWishItem = {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
};

const MAX_PER_WALL = 80;

const walls = new Map<string, PreviewWishItem[]>();

function sanitize(message: string): string {
  return message
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, 1000);
}

export function previewWishesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_RUNTIME === "1";
}

export function previewWishWallKey(
  link?: string | null,
  invitationId?: string | null
): string | null {
  const candidates = [link, invitationId].map((value) => value?.trim() ?? "").filter(Boolean);
  const key = candidates.find((value) => isPreviewInvitationId(value));
  return key ?? null;
}

export function listPreviewWishes(key: string): PreviewWishItem[] {
  return [...(walls.get(key) ?? [])];
}

export function addPreviewWish(
  key: string,
  input: { authorName: string; message: string }
): PreviewWishItem {
  const authorName = input.authorName.trim().slice(0, 80);
  const message = sanitize(input.message);
  if (!authorName) throw new Error("Please enter your name");
  if (message.length < 2) throw new Error("Please write a short note");

  const item: PreviewWishItem = {
    id: `preview-wish-${crypto.randomUUID()}`,
    authorName,
    message,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...(walls.get(key) ?? [])].slice(0, MAX_PER_WALL);
  walls.set(key, next);
  return item;
}

export function findPreviewWish(id: string): { key: string; item: PreviewWishItem } | null {
  for (const [key, items] of walls) {
    const item = items.find((wish) => wish.id === id);
    if (item) return { key, item };
  }
  return null;
}

export function updatePreviewWish(
  id: string,
  input: { authorName?: string; message?: string }
): PreviewWishItem | null {
  const found = findPreviewWish(id);
  if (!found) return null;
  const authorName =
    input.authorName !== undefined ? input.authorName.trim().slice(0, 80) : found.item.authorName;
  const message = input.message !== undefined ? sanitize(input.message) : found.item.message;
  if (!authorName) throw new Error("Please enter your name");
  if (message.length < 2) throw new Error("Please write a short note");
  const nextItem: PreviewWishItem = { ...found.item, authorName, message };
  walls.set(
    found.key,
    (walls.get(found.key) ?? []).map((wish) => (wish.id === id ? nextItem : wish))
  );
  return nextItem;
}

export function deletePreviewWish(id: string): boolean {
  const found = findPreviewWish(id);
  if (!found) return false;
  walls.set(
    found.key,
    (walls.get(found.key) ?? []).filter((wish) => wish.id !== id)
  );
  return true;
}
