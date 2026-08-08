import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createZipBufferFromEntries } from "@/lib/qr/zip-pack";
import { eventGuideService, GuideError } from "./event-guide.service";
import { guideSeatingService } from "./guide-seating.service";
import {
  OFFLINE_PACK_FORMAT,
  OFFLINE_TOKEN_PREFIX,
  assertPackPayloadIsSafe,
  buildOfflineSeatingIndex,
  defaultPackExpiry,
  digestFile,
  hashOfflinePackToken,
  mintOfflinePackToken,
  signManifest,
  type OfflinePackManifest,
  type OfflineSeatingMode,
} from "@/lib/event-guide/offline-pack";
import {
  aggregateQueue,
  normalizeQueue,
  planOfflineSync,
  type OfflineSyncReport,
} from "@/lib/event-guide/offline-sync";
import type { EventGuidePayload } from "@/lib/event-guide/types";

const RUNNER_SOURCE = join(process.cwd(), "scripts", "event-guide-offline-server.mjs");

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "event"
  );
}

export class EventGuideOfflinePackService {
  /**
   * Build a signed Venue Offline Pack.
   *
   * The pack is only ever produced for a *published* guide, its content is the
   * same snapshot guests see online, and it is scanned for contact data and
   * credentials before a single byte is written.
   */
  async build(input: {
    eventId: string;
    actorId: string;
  }): Promise<{ buffer: Buffer; filename: string; rawTokenOnce: string; expiresAt: Date }> {
    const guide = await prisma.eventGuide.findUnique({ where: { eventId: input.eventId } });
    if (!guide) throw new GuideError("Event Guide has not been set up yet", 404);
    if (!guide.venueOfflineEnabled) {
      throw new GuideError("Turn on Venue Offline Seating before downloading a pack", 400);
    }
    if (guide.status !== "PUBLISHED" || !guide.publishedPayload) {
      throw new GuideError("Publish the guide before building an offline pack", 400);
    }

    const event = await eventGuideService.getEvent(input.eventId);
    if (!event) throw new GuideError("Event not found", 404);

    const payload = guide.publishedPayload as unknown as EventGuidePayload;
    assertPackPayloadIsSafe(payload);

    const seatingMode = guide.offlineSeatingMode as OfflineSeatingMode;
    const seatingSalt = randomBytes(16).toString("hex");
    const seatingIndex =
      seatingMode === "DISABLED"
        ? []
        : buildOfflineSeatingIndex(
            await guideSeatingService.offlineSeatingSources(input.eventId),
            seatingMode,
            seatingSalt
          );

    // A hashed index must not carry names even by accident.
    if (seatingMode === "CODE_ONLY" || seatingMode === "HASHED_NAME") {
      assertPackPayloadIsSafe(seatingIndex);
      if (seatingIndex.some((entry) => entry.n || entry.members)) {
        throw new Error("Refusing to build offline pack: hashed index contained readable names");
      }
    }

    const { token, } = mintOfflinePackToken();
    const expiresAt = defaultPackExpiry(event.endDate, event.startDate);
    const previous = await prisma.eventGuideOfflinePack.findFirst({
      where: { guideId: guide.id },
      orderBy: { packVersion: "desc" },
      select: { packVersion: true },
    });
    const packVersion = (previous?.packVersion ?? 0) + 1;

    const runner = await readFile(RUNNER_SOURCE, "utf8");
    const guideJson = JSON.stringify(payload, null, 2);
    const seatingJson = JSON.stringify(seatingIndex);
    const readme = this.readme({
      eventTitle: event.title,
      seatingMode,
      expiresAt,
      venueLocalUrl: guide.venueLocalUrl,
      venueWifiName: guide.venueWifiName,
      token,
    });

    // The pack is intentionally flat: `createZipBufferFromEntries` reduces every
    // entry to a sanitised basename to make path traversal impossible, and a
    // single folder is easier for a venue operator to run anyway.
    const files: Array<{ path: string; content: string }> = [
      { path: "guide.json", content: guideJson },
      { path: "serve.mjs", content: runner },
      { path: "README.md", content: readme },
    ];
    if (seatingMode !== "DISABLED") {
      files.push({ path: "seating-index.json", content: seatingJson });
    }

    const manifestBody: Omit<OfflinePackManifest, "signature"> = {
      format: OFFLINE_PACK_FORMAT,
      packVersion,
      guideVersion: guide.version,
      eventTitle: event.title,
      tokenPrefix: OFFLINE_TOKEN_PREFIX,
      offlineToken: token,
      seatingMode,
      seatingSalt,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      venueWifiName: guide.venueWifiName,
      venueLocalUrl: guide.venueLocalUrl,
      files: files.map((file) => digestFile(file.path, file.content)),
    };
    const signature = signManifest(manifestBody);
    const manifest: OfflinePackManifest = { ...manifestBody, signature };

    const zip = await createZipBufferFromEntries([
      { name: "manifest.json", data: JSON.stringify(manifest, null, 2) },
      ...files.map((file) => ({ name: file.path, data: file.content })),
    ]);

    await prisma.eventGuideOfflinePack.create({
      data: {
        guideId: guide.id,
        tokenHash: hashOfflinePackToken(token),
        packVersion,
        guideVersion: guide.version,
        status: "ACTIVE",
        seatingMode: guide.offlineSeatingMode,
        signature,
        expiresAt,
        createdById: input.actorId,
      },
    });

    await createAuditLog({
      userId: input.actorId,
      action: "CREATE",
      entity: "event_guide_offline_pack",
      entityId: guide.id,
      details: {
        eventId: input.eventId,
        packVersion,
        seatingMode,
        seatingEntries: seatingIndex.length,
      },
    });

    return {
      buffer: zip,
      filename: `${slugify(event.title)}-event-guide-offline-pack-v${packVersion}.zip`,
      rawTokenOnce: token,
      expiresAt,
    };
  }

  async revoke(eventId: string, actorId: string, reason?: string) {
    const guide = await prisma.eventGuide.findUnique({ where: { eventId }, select: { id: true } });
    if (!guide) throw new GuideError("Event Guide has not been set up yet", 404);

    const result = await prisma.eventGuideOfflinePack.updateMany({
      where: { guideId: guide.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date(), revokedReason: reason ?? null },
    });

    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "event_guide_offline_pack",
      entityId: guide.id,
      details: { eventId, event: "revoked", packs: result.count },
    });

    return result.count;
  }

  async list(guideId: string) {
    return prisma.eventGuideOfflinePack.findMany({
      where: { guideId },
      orderBy: { packVersion: "desc" },
      take: 10,
      select: {
        id: true,
        packVersion: true,
        guideVersion: true,
        status: true,
        seatingMode: true,
        expiresAt: true,
        revokedAt: true,
        lastSyncedAt: true,
        lastSyncReport: true,
        syncedRecordCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * Apply a queue uploaded from a venue pack.
   *
   * Counters merge additively; content is never accepted, so there is nothing a
   * pack can overwrite. A guide republished since the pack was built is
   * reported as a conflict with the newer server version preserved.
   */
  async sync(input: {
    eventId: string;
    actorId: string;
    token: string;
    packVersion: number;
    guideVersion: number;
    records: unknown;
  }): Promise<OfflineSyncReport> {
    const guide = await prisma.eventGuide.findUnique({ where: { eventId: input.eventId } });
    if (!guide) throw new GuideError("Event Guide has not been set up yet", 404);

    const pack = await prisma.eventGuideOfflinePack.findFirst({
      where: { guideId: guide.id, tokenHash: hashOfflinePackToken(input.token) },
    });
    if (!pack) throw new GuideError("This offline pack is not recognised for this event", 404);

    const appliedIds = new Set<string>(
      Array.isArray((pack.lastSyncReport as { appliedRecordIds?: unknown } | null)?.appliedRecordIds)
        ? ((pack.lastSyncReport as { appliedRecordIds: string[] }).appliedRecordIds as string[])
        : []
    );

    const { report, apply } = planOfflineSync({
      request: {
        packVersion: input.packVersion,
        guideVersion: input.guideVersion,
        records: normalizeQueue(input.records),
      },
      pack: {
        status: pack.status as "ACTIVE" | "EXPIRED" | "REVOKED",
        packVersion: pack.packVersion,
        guideVersion: pack.guideVersion,
        expiresAt: pack.expiresAt,
        appliedRecordIds: appliedIds,
      },
      serverGuideVersion: guide.version,
    });

    if (apply.length > 0) {
      for (const bucket of aggregateQueue(apply)) {
        await eventGuideService.recordActivity({
          guideId: guide.id,
          tab: bucket.tab,
          channel: "VENUE_OFFLINE",
          day: bucket.day,
          views: bucket.views,
          searches: bucket.searches,
          matches: bucket.matches,
        });
      }
    }

    // Keep a bounded high-water mark so a replayed queue never double-counts.
    const retained = [...appliedIds, ...apply.map((r) => r.clientRecordId)].slice(-20000);

    await prisma.eventGuideOfflinePack.update({
      where: { id: pack.id },
      data: {
        lastSyncedAt: new Date(),
        syncedRecordCount: pack.syncedRecordCount + report.acceptedRecords,
        lastSyncReport: {
          ...report,
          appliedRecordIds: retained,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await createAuditLog({
      userId: input.actorId,
      action: "UPDATE",
      entity: "event_guide_offline_pack",
      entityId: pack.id,
      details: {
        eventId: input.eventId,
        accepted: report.acceptedRecords,
        duplicates: report.duplicateRecords,
        conflicts: report.conflicts.map((c) => c.kind),
      },
    });

    return report;
  }

  private readme(input: {
    eventTitle: string;
    seatingMode: OfflineSeatingMode;
    expiresAt: Date;
    venueLocalUrl: string | null;
    venueWifiName: string | null;
    token: string;
  }): string {
    const address = input.venueLocalUrl?.replace(/\/$/, "") || "http://<this-machine-ip>:4173";
    return `# Event Guide — Venue Offline Pack

**${input.eventTitle}**

This pack lets the Event Guide work on the venue network when the internet is
down. It contains the published programme, menu and theme${
      input.seatingMode === "DISABLED" ? "" : ", plus a seating lookup index"
    }.

## Run it

Requires Node 18 or newer. Unzip this pack, then from inside the folder:

    node serve.mjs --port 4173

The runner verifies the pack signature before it starts. If verification fails
it will refuse to run — that means the pack was altered, so download a fresh one.

Guests then open:

    ${address}/guide/${input.token}

## Important

- This address only works for devices connected to${
      input.venueWifiName ? ` the "${input.venueWifiName}" Wi-Fi` : " the event Wi-Fi"
    } at this venue. The printed backup QR says the same.
- This pack expires on ${input.expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC and stops serving afterwards.
- Treat this file like a key. It is the credential for the local guide.
- ${
      input.seatingMode === "NAME_INDEX"
        ? "This pack uses the readable name index, so it contains guest names. Store it like a guest list and delete it after the event."
        : "This pack stores only one-way hashes for seating lookups — it contains no readable guest names."
    }
- The pack cannot change seating. Seat assignments stay in the Celeventic seating studio.

## After the event

Sign in to Celeventic, open Event Guide → Offline Readiness, and upload
\`sync-queue.json\` (written next to the runner) so the anonymous counters are
merged into your event analytics.
`;
  }
}

export const eventGuideOfflinePackService = new EventGuideOfflinePackService();
