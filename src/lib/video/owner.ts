/**
 * Canonical VideoAsset ownership fields for Prisma writes.
 * Separates the User FK (`ownerId`) from storage/quota identity.
 */

import type { VideoAsset, VideoOwnerType } from "@prisma/client";

export type VideoAssetOwnerWrite =
  | { ownerType: "USER"; ownerId: string }
  | { ownerType: "GUEST_TOKEN"; ownerId: null };

export function videoAssetOwnerWrite(input: {
  ownerType: VideoOwnerType;
  ownerId: string | null | undefined;
}): VideoAssetOwnerWrite {
  if (input.ownerType === "USER") {
    if (!input.ownerId) {
      throw new Error("USER VideoAsset requires a real User.id in ownerId.");
    }
    return { ownerType: "USER", ownerId: input.ownerId };
  }
  return { ownerType: "GUEST_TOKEN", ownerId: null };
}

/** Stable rate-limit / quota namespace — never a bare Event.id mistaken for User.id. */
export function userQuotaKey(userId: string): string {
  return `user:${userId}`;
}

export function eventQuotaKey(eventId: string): string {
  return `event:${eventId}`;
}

export function rateLimitKeyForAsset(
  asset: Pick<VideoAsset, "ownerType" | "ownerId" | "eventId" | "id">
): string {
  if (asset.ownerType === "GUEST_TOKEN" && asset.eventId) {
    return eventQuotaKey(asset.eventId);
  }
  if (asset.ownerId) {
    return userQuotaKey(asset.ownerId);
  }
  return asset.id;
}
