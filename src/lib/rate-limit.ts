import { cacheGet, cacheSet } from "@/lib/redis";

const memoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `ratelimit:${key}`;

  const cached = await cacheGet<{ count: number; resetAt: number }>(redisKey);
  if (cached && cached.resetAt > now) {
    if (cached.count >= limit) {
      return { success: false, remaining: 0, resetAt: cached.resetAt };
    }
    const updated = { count: cached.count + 1, resetAt: cached.resetAt };
    await cacheSet(redisKey, updated, Math.ceil((cached.resetAt - now) / 1000));
    return { success: true, remaining: limit - updated.count, resetAt: cached.resetAt };
  }

  const mem = memoryStore.get(key);
  if (mem && mem.resetAt > now) {
    if (mem.count >= limit) {
      return { success: false, remaining: 0, resetAt: mem.resetAt };
    }
    mem.count++;
    return { success: true, remaining: limit - mem.count, resetAt: mem.resetAt };
  }

  const resetAt = now + windowSeconds * 1000;
  const entry = { count: 1, resetAt };
  memoryStore.set(key, entry);
  await cacheSet(redisKey, entry, windowSeconds);
  return { success: true, remaining: limit - 1, resetAt };
}
