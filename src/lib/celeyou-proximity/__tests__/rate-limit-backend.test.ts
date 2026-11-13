import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rateLimit, rateLimitBackend } from "@/lib/rate-limit";

describe("CeleYou rate-limit backend", () => {
  it("reports whether limits are process-local or Redis-shared", () => {
    const backend = rateLimitBackend();
    assert.ok(backend === "redis" || backend === "memory");
    if (!process.env.REDIS_URL) {
      assert.equal(backend, "memory");
    }
  });

  it("enforces a window in the current process", async () => {
    const key = `tap-e2e-${Date.now()}-${Math.random()}`;
    const first = await rateLimit(key, 2, 60);
    const second = await rateLimit(key, 2, 60);
    const third = await rateLimit(key, 2, 60);
    assert.equal(first.success, true);
    assert.equal(second.success, true);
    assert.equal(third.success, false);
    assert.equal(third.remaining, 0);
  });
});
