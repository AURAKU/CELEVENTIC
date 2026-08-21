import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { videoAssetOwnerWrite, eventQuotaKey, userQuotaKey, rateLimitKeyForAsset } from "../owner";
import { buildRawVideoKey } from "../key-builder";
import { checkDailyUploadQuota } from "../quota";
import { createAndQueueLocalVideoAsset } from "../processing";

/**
 * Regression suite for production P2003:
 * GUEST_TOKEN uploads must never place Event.id into VideoAsset.ownerId (User FK).
 */

let testUserId: string;
let testEventId: string;
let uploadTokenPlain: string;
let uploadTokenId: string;
let otherEventId: string;
let otherUploadToken: string;
const createdAssetIds: string[] = [];

before(async () => {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.create({
    data: {
      name: "Guest Owner FK Test User",
      email: `guest-owner-fk-${randomUUID()}@example.test`,
    },
  });
  testUserId = user.id;

  const event = await prisma.event.create({
    data: {
      title: "Guest Owner FK Memorial",
      slug: `guest-owner-fk-${randomUUID().slice(0, 8)}`,
      eventType: "FUNERAL",
      hostName: "Test Host",
      startDate: new Date("2026-09-01T10:00:00.000Z"),
      organizerId: testUserId,
    },
  });
  testEventId = event.id;

  const other = await prisma.event.create({
    data: {
      title: "Other Event",
      slug: `guest-owner-fk-other-${randomUUID().slice(0, 8)}`,
      eventType: "FUNERAL",
      hostName: "Other Host",
      startDate: new Date("2026-09-02T10:00:00.000Z"),
      organizerId: testUserId,
    },
  });
  otherEventId = other.id;

  const token = await prisma.eventMemoryToken.create({
    data: {
      eventId: testEventId,
      token: `tok_${randomUUID().replace(/-/g, "")}`,
      type: "UPLOAD",
    },
  });
  uploadTokenPlain = token.token;
  uploadTokenId = token.id;

  const otherTok = await prisma.eventMemoryToken.create({
    data: {
      eventId: otherEventId,
      token: `tok_${randomUUID().replace(/-/g, "")}`,
      type: "UPLOAD",
    },
  });
  otherUploadToken = otherTok.token;
});

after(async () => {
  const { prisma } = await import("@/lib/prisma");
  if (createdAssetIds.length) {
    await prisma.videoAsset.deleteMany({ where: { id: { in: createdAssetIds } } }).catch(() => {});
  }
  await prisma.eventMemoryToken.deleteMany({
    where: { eventId: { in: [testEventId, otherEventId] } },
  }).catch(() => {});
  await prisma.event.deleteMany({ where: { id: { in: [testEventId, otherEventId] } } }).catch(() => {});
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  await prisma.$disconnect();
});

describe("videoAssetOwnerWrite invariants", () => {
  it("USER requires a real ownerId; GUEST_TOKEN forces null", () => {
    assert.deepEqual(videoAssetOwnerWrite({ ownerType: "USER", ownerId: "user_abc" }), {
      ownerType: "USER",
      ownerId: "user_abc",
    });
    assert.deepEqual(videoAssetOwnerWrite({ ownerType: "GUEST_TOKEN", ownerId: "should-ignore" }), {
      ownerType: "GUEST_TOKEN",
      ownerId: null,
    });
    assert.throws(() => videoAssetOwnerWrite({ ownerType: "USER", ownerId: null }));
  });

  it("quota keys do not collide across user vs event scopes", () => {
    const userKey = userQuotaKey(testUserId);
    const eventKey = eventQuotaKey(testEventId);
    assert.equal(userKey.startsWith("user:"), true);
    assert.equal(eventKey.startsWith("event:"), true);
    assert.notEqual(userKey, eventKey);
    // Even if somehow ids matched, prefixes keep them apart.
    assert.notEqual(userQuotaKey(testEventId), eventQuotaKey(testEventId));
  });
});

describe("guestbook principal (A)", () => {
  it("resolves GUEST_TOKEN with ownerId null and event-scoped quotaKey", async () => {
    const { resolveUploadPrincipal } = await import("../principal");
    const principal = await resolveUploadPrincipal({
      category: "GUESTBOOK",
      guestToken: uploadTokenPlain,
      guestName: "Ama",
    });
    assert.equal(principal.ownerType, "GUEST_TOKEN");
    assert.equal(principal.ownerId, null);
    assert.equal(principal.eventId, testEventId);
    assert.equal(principal.quotaKey, eventQuotaKey(testEventId));
    assert.equal(principal.storageKey, eventQuotaKey(testEventId));
    assert.equal(principal.context.uploadTokenId, uploadTokenId);
    assert.equal(principal.context.guestToken, undefined);
  });
});

describe("guest VideoAsset creation without User for eventId (B, H)", () => {
  it("creates GUEST_TOKEN asset with ownerId NULL and does not P2003", async () => {
    const { prisma } = await import("@/lib/prisma");
    const owner = videoAssetOwnerWrite({ ownerType: "GUEST_TOKEN", ownerId: null });
    const { key, id } = buildRawVideoKey("GUESTBOOK", eventQuotaKey(testEventId), "mp4");
    const asset = await prisma.videoAsset.create({
      data: {
        id,
        category: "GUESTBOOK",
        status: "UPLOADING",
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        eventId: testEventId,
        context: { uploadTokenId },
        originalKey: key,
        originalFilename: "memory.mp4",
        originalMimeType: "video/mp4",
        originalExtension: "mp4",
        sizeBytes: BigInt(1024),
      },
    });
    createdAssetIds.push(asset.id);
    assert.equal(asset.ownerType, "GUEST_TOKEN");
    assert.equal(asset.ownerId, null);
    assert.equal(asset.eventId, testEventId);
  });
});

describe("signed-in USER create still uses User FK (C)", () => {
  it("creates USER asset with real ownerId", async () => {
    const { prisma } = await import("@/lib/prisma");
    const owner = videoAssetOwnerWrite({ ownerType: "USER", ownerId: testUserId });
    const { key, id } = buildRawVideoKey("PREMIUM", userQuotaKey(testUserId), "mp4");
    const asset = await prisma.videoAsset.create({
      data: {
        id,
        category: "PREMIUM",
        status: "UPLOADING",
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        originalKey: key,
        originalFilename: "clip.mp4",
        originalMimeType: "video/mp4",
        originalExtension: "mp4",
        sizeBytes: BigInt(2048),
      },
    });
    createdAssetIds.push(asset.id);
    assert.equal(asset.ownerType, "USER");
    assert.equal(asset.ownerId, testUserId);
  });
});

describe("invalid USER FK still fails (D)", () => {
  it("rejects bogus ownerId for USER (integrity intact)", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { key, id } = buildRawVideoKey("PREMIUM", "user:bogus", "mp4");
    await assert.rejects(
      () =>
        prisma.videoAsset.create({
          data: {
            id,
            category: "PREMIUM",
            status: "UPLOADING",
            ownerType: "USER",
            ownerId: `missing-user-${randomUUID()}`,
            originalKey: key,
            originalFilename: "bad.mp4",
            originalMimeType: "video/mp4",
            originalExtension: "mp4",
            sizeBytes: BigInt(1),
          },
        }),
      (err: unknown) =>
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003"
    );
  });
});

describe("guest asset access (E)", () => {
  it("allows same-event token and rejects wrong-event / missing token", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { assertAssetAccess, UploadAuthError } = await import("../principal");
    const { key, id } = buildRawVideoKey("GUESTBOOK", eventQuotaKey(testEventId), "mp4");
    const asset = await prisma.videoAsset.create({
      data: {
        id,
        category: "GUESTBOOK",
        status: "UPLOADING",
        ownerType: "GUEST_TOKEN",
        ownerId: null,
        eventId: testEventId,
        originalKey: key,
        originalFilename: "access.mp4",
        originalMimeType: "video/mp4",
        originalExtension: "mp4",
        sizeBytes: BigInt(10),
      },
    });
    createdAssetIds.push(asset.id);

    await assertAssetAccess(asset, { guestToken: uploadTokenPlain });

    await assert.rejects(
      () => assertAssetAccess(asset, { guestToken: otherUploadToken }),
      (e: unknown) => e instanceof UploadAuthError && e.status === 403
    );
    await assert.rejects(
      () => assertAssetAccess(asset, { guestToken: null }),
      (e: unknown) => e instanceof UploadAuthError && e.status === 401
    );
    await assert.rejects(
      () => assertAssetAccess(asset, { guestToken: "not-a-real-token" }),
      (e: unknown) => e instanceof UploadAuthError && e.status === 403
    );
  });
});

describe("quota / rate-limit scopes (F)", () => {
  it("guest quota groups by event; user quota groups by ownerId", async () => {
    const guest = await checkDailyUploadQuota(
      { ownerType: "GUEST_TOKEN", ownerId: null, eventId: testEventId },
      1024
    );
    assert.equal(guest.allowed, true);

    const user = await checkDailyUploadQuota(
      { ownerType: "USER", ownerId: testUserId, eventId: null },
      1024
    );
    assert.equal(user.allowed, true);

    const guestAsset = {
      ownerType: "GUEST_TOKEN" as const,
      ownerId: null,
      eventId: testEventId,
      id: "asset-guest",
    };
    const userAsset = {
      ownerType: "USER" as const,
      ownerId: testUserId,
      eventId: null,
      id: "asset-user",
    };
    assert.equal(rateLimitKeyForAsset(guestAsset), eventQuotaKey(testEventId));
    assert.equal(rateLimitKeyForAsset(userAsset), userQuotaKey(testUserId));
    assert.notEqual(rateLimitKeyForAsset(guestAsset), rateLimitKeyForAsset(userAsset));
  });
});

describe("local fallback GUEST_TOKEN path (G)", () => {
  it("createAndQueueLocalVideoAsset accepts GUEST_TOKEN with null ownerId", async () => {
    process.env.UPLOAD_DIR =
      process.env.UPLOAD_DIR || `/tmp/celeventic-guest-video-${randomUUID()}`;

    const buf = Buffer.alloc(4096);
    buf.writeUInt32BE(0x18, 0);
    buf.write("ftyp", 4, "latin1");
    buf.write("isom", 8, "latin1");

    const asset = await createAndQueueLocalVideoAsset({
      category: "GUESTBOOK",
      ownerType: "GUEST_TOKEN",
      ownerId: null,
      storageKey: eventQuotaKey(testEventId),
      eventId: testEventId,
      context: { uploadTokenId },
      originalFilename: "local-guest.mp4",
      originalMimeType: "video/mp4",
      originalExtension: "mp4",
      buffer: buf,
    });
    createdAssetIds.push(asset.id);
    assert.equal(asset.ownerType, "GUEST_TOKEN");
    assert.equal(asset.ownerId, null);
    assert.equal(asset.eventId, testEventId);
    assert.notEqual(asset.status, undefined);
  });
});
