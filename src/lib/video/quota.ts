import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { VideoCategory } from "@/lib/video/constants";
import type { VideoOwnerType } from "@prisma/client";

/** Presign/complete/part endpoints are rate-limited per principal to blunt abuse and cost spikes. */
export async function checkUploadRateLimit(
  action: "presign" | "part" | "complete",
  quotaKey: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limits: Record<typeof action, { limit: number; windowSeconds: number }> = {
    presign: { limit: 20, windowSeconds: 60 * 10 },
    part: { limit: 600, windowSeconds: 60 * 10 },
    complete: { limit: 30, windowSeconds: 60 * 10 },
  } as const;
  const cfg = limits[action];
  const result = await rateLimit(`video-upload:${action}:${quotaKey}`, cfg.limit, cfg.windowSeconds);
  if (!result.success) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.round((result.resetAt - Date.now()) / 1000)) };
  }
  return { allowed: true };
}

const DAILY_UPLOAD_LIMIT_PER_OWNER = 40;
const DAILY_UPLOAD_BYTES_LIMIT_PER_OWNER = 8 * 1024 * 1024 * 1024; // 8GB/day/owner soft cap

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
}

export type UploadQuotaScope = {
  ownerType: VideoOwnerType;
  /** Real User.id when ownerType is USER. */
  ownerId: string | null;
  /** Required when ownerType is GUEST_TOKEN — guest quota is per event. */
  eventId: string | null;
};

/**
 * Daily quota by deliberate scope:
 * - USER → VideoAsset.ownerId (User FK)
 * - GUEST_TOKEN → ownerType + eventId (never a fake User.id)
 */
export async function checkDailyUploadQuota(
  scope: UploadQuotaScope,
  sizeBytes: number
): Promise<QuotaCheckResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const where =
    scope.ownerType === "GUEST_TOKEN"
      ? {
          ownerType: "GUEST_TOKEN" as const,
          eventId: scope.eventId ?? undefined,
          createdAt: { gte: since },
          status: { not: "CANCELLED" as const },
        }
      : {
          ownerId: scope.ownerId ?? undefined,
          createdAt: { gte: since },
          status: { not: "CANCELLED" as const },
        };

  if (scope.ownerType === "GUEST_TOKEN" && !scope.eventId) {
    return { allowed: false, reason: "Guest upload event is required for quota." };
  }
  if (scope.ownerType === "USER" && !scope.ownerId) {
    return { allowed: false, reason: "Signed-in upload owner is required for quota." };
  }

  const [count, agg] = await Promise.all([
    prisma.videoAsset.count({ where }),
    prisma.videoAsset.aggregate({
      where,
      _sum: { sizeBytes: true },
    }),
  ]);

  if (count >= DAILY_UPLOAD_LIMIT_PER_OWNER) {
    return { allowed: false, reason: "Daily upload limit reached. Please try again tomorrow." };
  }
  const usedBytes = Number(agg._sum.sizeBytes ?? BigInt(0));
  if (usedBytes + sizeBytes > DAILY_UPLOAD_BYTES_LIMIT_PER_OWNER) {
    return { allowed: false, reason: "Daily upload storage limit reached. Please try again tomorrow." };
  }
  return { allowed: true };
}

export function categoryQuotaKey(category: VideoCategory, quotaKey: string): string {
  return `${category}:${quotaKey}`;
}
