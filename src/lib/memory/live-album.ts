/** Stable, URL-safe key for an invitation-scoped live album. */
export function liveAlbumKey(invitationId: string): string {
  const raw = invitationId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return raw || "album";
}

export function liveAlbumPaths(invitationId: string) {
  const key = liveAlbumKey(invitationId);
  return {
    key,
    api: `/api/memory/live-album/${key}`,
    album: `/memory/live/${key}`,
    lens: `/memory/live/${key}?lens=1`,
  };
}

export type LiveAlbumItem = {
  id: string;
  url: string;
  relativePath: string;
  mediaType: "image" | "video";
  createdAt: string;
  guestName?: string;
};
