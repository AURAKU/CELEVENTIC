import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { VideoCategory } from "@/lib/video/constants";

/** Presign/complete/part endpoints are rate-limited per principal to blunt abuse and cost spikes. */
export async function checkUploadRateLimit(
  action: "presign" | "part" | "complete",
  ownerKey: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limits: Record<typeof action, { limit: number; windowSeconds: number }> = {
    presign: { limit: 20, windowSeconds: 60 * 10 },
    part: { limit: 600, windowSeconds: 60 * 10 },
    complete: { limit: 30, windowSeconds: 60 * 10 },
  } as const;
  const cfg = limits[action];
  const result = await rateLimit(`video-upload:${action}:${ownerKey}`, cfg.limit, cfg.windowSeconds);
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

/** Per-owner daily quota across all categories — prevents a single account from monopolizing MediaConvert spend. */
export async function checkDailyUploadQuota(ownerId: string, sizeBytes: number): Promise<QuotaCheckResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [count, agg] = await Promise.all([
    prisma.videoAsset.count({
      where: { ownerId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
    }),
    prisma.videoAsset.aggregate({
      where: { ownerId, createdAt: { gte: since }, status: { not: "CANCELLED" } },
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

export function categoryQuotaKey(category: VideoCategory, ownerId: string): string {
  return `${category}:${ownerId}`;
}
