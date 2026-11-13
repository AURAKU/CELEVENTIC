import { redis } from "@/lib/redis";

const memoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimitBackend(): "redis" | "memory" {
  return redis ? "redis" : "memory";
}

/**
 * Shared across processes only when REDIS_URL is reachable.
 * Memory fallback is per Node process. Do not treat local limits as cluster-wide.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  if (redis) {
    try {
      const redisKey = `rl:v2:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      const ttlMs = await redis.pttl(redisKey);
      const resetAt = now + (ttlMs > 0 ? ttlMs : windowSeconds * 1000);
      if (count > limit) {
        return { success: false, remaining: 0, resetAt };
      }
      return { success: true, remaining: Math.max(0, limit - count), resetAt };
    } catch {
      // Redis down. Fall through to process memory. Limits will not be shared.
    }
  }

  const mem = memoryStore.get(key);
  if (mem && mem.resetAt > now) {
    if (mem.count >= limit) {
      return { success: false, remaining: 0, resetAt: mem.resetAt };
    }
    mem.count += 1;
    return { success: true, remaining: limit - mem.count, resetAt: mem.resetAt };
  }

  const resetAt = now + windowSeconds * 1000;
  memoryStore.set(key, { count: 1, resetAt });
  return { success: true, remaining: limit - 1, resetAt };
}
