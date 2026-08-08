import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GUIDE_CACHE_SCHEMA,
  GUIDE_SW_SCOPE,
  cachesForToken,
  cachesToEvict,
  formatLastSync,
  guideCacheName,
  guidePageUrl,
  guidePayloadUrl,
  isChunkLoadError,
  isGuideCacheName,
  parseGuideCacheName,
} from "../offline-cache";

const ALPHA = "tok_alpha";
const BETA = "tok_beta";

describe("cache naming", () => {
  it("keys a cache by both token and published version", () => {
    const name = guideCacheName(ALPHA, 4);
    const parsed = parseGuideCacheName(name);
    assert.deepEqual(parsed, { schema: GUIDE_CACHE_SCHEMA, token: ALPHA, version: 4 });
  });

  it("gives two events different cache names", () => {
    assert.notEqual(guideCacheName(ALPHA, 1), guideCacheName(BETA, 1));
  });

  it("gives two publications of the same guide different cache names", () => {
    assert.notEqual(guideCacheName(ALPHA, 1), guideCacheName(ALPHA, 2));
  });

  it("refuses to parse a name that is not ours", () => {
    assert.equal(parseGuideCacheName("next-static-assets"), null);
    assert.equal(parseGuideCacheName("event-guide:v1:tok"), null);
    assert.equal(parseGuideCacheName("event-guide:v1:tok:notanumber"), null);
    assert.equal(isGuideCacheName("workbox-precache"), false);
  });
});

describe("cache isolation between events", () => {
  const existing = [
    guideCacheName(ALPHA, 1),
    guideCacheName(ALPHA, 2),
    guideCacheName(BETA, 9),
    "event-guide:v0:tok_alpha:2",
    "next-static-assets",
    "workbox-precache-v2",
  ];

  it("evicts every other guide cache when a new version goes live", () => {
    const keep = guideCacheName(ALPHA, 2);
    const evicted = cachesToEvict(existing, keep);

    assert.ok(evicted.includes(guideCacheName(ALPHA, 1)), "older version of this guide");
    assert.ok(evicted.includes(guideCacheName(BETA, 9)), "another event's guide");
    assert.ok(evicted.includes("event-guide:v0:tok_alpha:2"), "a previous cache schema");
    assert.ok(!evicted.includes(keep));
  });

  it("never touches caches owned by the rest of the app", () => {
    const evicted = cachesToEvict(existing, guideCacheName(ALPHA, 2));
    assert.ok(!evicted.includes("next-static-assets"));
    assert.ok(!evicted.includes("workbox-precache-v2"));
  });

  it("purges only the revoked token's caches, leaving other events alone", () => {
    const doomed = cachesForToken(existing, ALPHA);
    assert.ok(doomed.includes(guideCacheName(ALPHA, 1)));
    assert.ok(doomed.includes(guideCacheName(ALPHA, 2)));
    assert.ok(!doomed.includes(guideCacheName(BETA, 9)));
    assert.ok(!doomed.includes("next-static-assets"));
  });

  it("purges nothing for a token that was never cached", () => {
    assert.deepEqual(cachesForToken(existing, "tok_unknown"), []);
  });
});

describe("urls", () => {
  it("scopes the service worker to the guide route only", () => {
    assert.equal(GUIDE_SW_SCOPE, "/event-guide/");
    assert.ok(guidePageUrl(ALPHA).startsWith(GUIDE_SW_SCOPE));
  });

  it("encodes the token so a hostile string cannot escape the path", () => {
    const url = guidePayloadUrl("../../admin");
    assert.ok(!url.includes("../"));
    assert.equal(url, "/api/public/event-guide/..%2F..%2Fadmin");
  });
});

describe("the offline indicator", () => {
  const now = new Date("2026-08-06T12:00:00Z");

  it("describes when the guide last synced, in plain language", () => {
    assert.equal(formatLastSync("2026-08-06T11:59:40Z", now), "moments ago");
    assert.equal(formatLastSync("2026-08-06T11:55:00Z", now), "5 minutes ago");
    assert.equal(formatLastSync("2026-08-06T11:59:00Z", now), "1 minute ago");
    assert.equal(formatLastSync("2026-08-06T09:00:00Z", now), "3 hours ago");
    assert.equal(formatLastSync("2026-08-04T12:00:00Z", now), "2 days ago");
  });

  it("says so plainly when there is nothing cached yet", () => {
    assert.equal(formatLastSync(null, now), "not yet synced");
    assert.equal(formatLastSync("nonsense", now), "not yet synced");
  });

  it("never shows a negative age from a clock skew", () => {
    assert.equal(formatLastSync("2026-08-06T12:05:00Z", now), "moments ago");
  });
});

describe("stale deploy recovery", () => {
  it("recognises the ways a stale service worker reports a missing chunk", () => {
    assert.equal(isChunkLoadError({ name: "ChunkLoadError" }), true);
    assert.equal(isChunkLoadError(new Error("Loading chunk 42 failed")), true);
    assert.equal(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /x.js")), true);
    assert.equal(isChunkLoadError(new Error("error loading dynamically imported module")), true);
  });

  it("does not mistake an ordinary failure for a stale deploy", () => {
    assert.equal(isChunkLoadError(new Error("Network request failed")), false);
    assert.equal(isChunkLoadError(null), false);
    assert.equal(isChunkLoadError(undefined), false);
    assert.equal(isChunkLoadError("ChunkLoadError"), false);
  });
});
