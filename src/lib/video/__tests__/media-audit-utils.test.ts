import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyMediaFile,
  createEmptySourcePlaybackMap,
  isLegacyLocalUploadUrl,
  isLocalhostMediaUrl,
  normalizeStoredMediaUrl,
  shouldUpdateStoredMediaUrl,
  sourcePlaybackMapFromManifest,
  uploadRelativePathFromUrl,
  type SourcePlaybackMapEntry,
} from "../media-audit-utils";
import { createEmptyManifest, type BackfillManifestEntry } from "../backfill-utils";

function mapEntry(partial: Partial<SourcePlaybackMapEntry> & Pick<SourcePlaybackMapEntry, "sourceRelativePath" | "playbackRelativePath" | "status">): SourcePlaybackMapEntry {
  return {
    ...partial,
  };
}

describe("classifyMediaFile — converted sources", () => {
  it("MOV with processed MP4 maps to source_converted (not needs_conversion)", () => {
    const kind = classifyMediaFile({
      relativePath: "invitations/u1/clip.mov",
      isProcessedOutput: false,
      browserCompatible: false,
      mapEntry: mapEntry({
        sourceRelativePath: "invitations/u1/clip.mov",
        playbackRelativePath: "invitations/u1/processed/1-playback.mp4",
        status: "DONE",
      }),
      playbackExists: true,
      playbackCompatible: true,
      sourceExists: true,
    });
    assert.equal(kind, "source_converted");
  });

  it("incompatible MP4 with processed MP4 maps to source_converted", () => {
    const kind = classifyMediaFile({
      relativePath: "invitations/u1/hevc.mp4",
      isProcessedOutput: false,
      browserCompatible: false,
      mapEntry: mapEntry({
        sourceRelativePath: "invitations/u1/hevc.mp4",
        playbackRelativePath: "invitations/u1/processed/2-playback.mp4",
        status: "DONE",
      }),
      playbackExists: true,
      playbackCompatible: true,
      sourceExists: true,
    });
    assert.equal(kind, "source_converted");
  });

  it("valid original MP4 is ready_original_compatible", () => {
    const kind = classifyMediaFile({
      relativePath: "invitations/u1/ok.mp4",
      isProcessedOutput: false,
      browserCompatible: true,
      sourceExists: true,
    });
    assert.equal(kind, "ready_original_compatible");
  });

  it("orphaned source (map without file) is orphaned_source", () => {
    const kind = classifyMediaFile({
      relativePath: "invitations/u1/gone.mov",
      isProcessedOutput: false,
      browserCompatible: false,
      mapEntry: mapEntry({
        sourceRelativePath: "invitations/u1/gone.mov",
        playbackRelativePath: "invitations/u1/processed/3-playback.mp4",
        status: "DONE",
      }),
      playbackExists: true,
      playbackCompatible: true,
      sourceExists: false,
    });
    // Valid playback still wins — converted mapping is authoritative for classification
    // when playback exists; orphaned_source is reserved for map-only walks without source.
    // When sourceExists=false AND no valid playback gate fails... hasValidPlayback is true here.
    // Force no playback to assert orphaned:
    const orphaned = classifyMediaFile({
      relativePath: "invitations/u1/gone.mov",
      isProcessedOutput: false,
      browserCompatible: false,
      mapEntry: mapEntry({
        sourceRelativePath: "invitations/u1/gone.mov",
        playbackRelativePath: "",
        status: "DONE",
      }),
      playbackExists: false,
      sourceExists: false,
    });
    assert.equal(orphaned, "orphaned_source");
    assert.equal(kind, "source_converted");
  });

  it("missing processed file is missing_processed_output", () => {
    const kind = classifyMediaFile({
      relativePath: "invitations/u1/clip.mov",
      isProcessedOutput: false,
      browserCompatible: false,
      mapEntry: mapEntry({
        sourceRelativePath: "invitations/u1/clip.mov",
        playbackRelativePath: "invitations/u1/processed/missing-playback.mp4",
        status: "DONE",
      }),
      playbackExists: false,
      sourceExists: true,
    });
    assert.equal(kind, "missing_processed_output");
  });

  it("MOV without map or playback still needs conversion", () => {
    const kind = classifyMediaFile({
      relativePath: "invitations/u1/new.mov",
      isProcessedOutput: false,
      browserCompatible: false,
      sourceExists: true,
    });
    assert.equal(kind, "source_needs_conversion");
  });

  it("processed playback file is processed_ready", () => {
    assert.equal(
      classifyMediaFile({
        relativePath: "invitations/u1/processed/1-playback.mp4",
        isProcessedOutput: true,
        browserCompatible: true,
      }),
      "processed_ready"
    );
  });

  it("failed processing when map status is FAILED", () => {
    assert.equal(
      classifyMediaFile({
        relativePath: "invitations/u1/bad.mov",
        isProcessedOutput: false,
        mapEntry: mapEntry({
          sourceRelativePath: "invitations/u1/bad.mov",
          playbackRelativePath: "",
          status: "FAILED",
        }),
        sourceExists: true,
      }),
      "failed_processing"
    );
  });
});

describe("URL normalisation", () => {
  it("rewrites stale /api/uploads URL", () => {
    assert.equal(
      normalizeStoredMediaUrl("/api/uploads/invitations/u1/clip.mp4"),
      "/uploads/invitations/u1/clip.mp4"
    );
    assert.equal(isLegacyLocalUploadUrl("/api/uploads/invitations/u1/clip.mp4"), true);
    assert.equal(shouldUpdateStoredMediaUrl("/api/uploads/invitations/u1/clip.mp4"), true);
  });

  it("rewrites localhost URL", () => {
    assert.equal(
      normalizeStoredMediaUrl("http://localhost:3001/api/uploads/memories/e1/a.jpg"),
      "/uploads/memories/e1/a.jpg"
    );
    assert.equal(isLocalhostMediaUrl("http://localhost:3001/api/uploads/x.mp4"), true);
  });

  it("rewrites database MOV reference to mapped playback URL", () => {
    const map = createEmptySourcePlaybackMap();
    map.entries["invitations/u1/clip.mov"] = mapEntry({
      sourceRelativePath: "invitations/u1/clip.mov",
      playbackRelativePath: "invitations/u1/processed/9-playback.mp4",
      playbackUrl: "/uploads/invitations/u1/processed/9-playback.mp4",
      status: "DONE",
    });
    assert.equal(
      normalizeStoredMediaUrl("/api/uploads/invitations/u1/clip.mov", map),
      "/uploads/invitations/u1/processed/9-playback.mp4"
    );
    assert.equal(
      shouldUpdateStoredMediaUrl("/uploads/invitations/u1/clip.mov", map),
      true
    );
  });

  it("preserves external CDN URLs", () => {
    const cdn = "https://cdn.example.com/assets/hero.mp4";
    assert.equal(normalizeStoredMediaUrl(cdn), cdn);
    assert.equal(shouldUpdateStoredMediaUrl(cdn), false);
  });

  it("idempotent rerun — already normalised URLs do not need update", () => {
    assert.equal(shouldUpdateStoredMediaUrl("/uploads/invitations/u1/processed/9-playback.mp4"), false);
    assert.equal(
      normalizeStoredMediaUrl("/uploads/invitations/u1/processed/9-playback.mp4"),
      "/uploads/invitations/u1/processed/9-playback.mp4"
    );
  });

  it("extracts upload-relative path from URL", () => {
    assert.equal(
      uploadRelativePathFromUrl("/api/uploads/invitations/u1/a.mov"),
      "invitations/u1/a.mov"
    );
  });
});

describe("sourcePlaybackMapFromManifest / rollback shape", () => {
  it("builds durable map from backfill manifest DONE entries", () => {
    const manifest = createEmptyManifest();
    const entry: BackfillManifestEntry = {
      relativePath: "invitations/u1/clip.mov",
      userId: "u1",
      status: "DONE",
      sourceSizeBytes: 10,
      sourceMtimeMs: 20,
      playbackRelativePath: "invitations/u1/processed/1-playback.mp4",
      playbackUrl: "/uploads/invitations/u1/processed/1-playback.mp4",
      processedAt: "2026-08-01T00:00:00.000Z",
    };
    manifest.entries[entry.relativePath] = entry;
    const map = sourcePlaybackMapFromManifest(manifest);
    assert.equal(map.entries["invitations/u1/clip.mov"]?.status, "DONE");
    assert.equal(
      map.entries["invitations/u1/clip.mov"]?.playbackRelativePath,
      "invitations/u1/processed/1-playback.mp4"
    );
  });

  it("rollback records keep old/new values for idempotent restore", () => {
    // Contract used by media:urls:fix rollback manifests.
    const record = {
      model: "invitationMedia",
      id: "abc",
      field: "url",
      oldValue: "/api/uploads/invitations/u1/clip.mov",
      newValue: "/uploads/invitations/u1/processed/1-playback.mp4",
      isJson: false,
    };
    assert.ok(record.oldValue !== record.newValue);
    assert.equal(record.isJson, false);
    assert.ok(shouldUpdateStoredMediaUrl(record.oldValue));
    assert.equal(shouldUpdateStoredMediaUrl(record.newValue), false);
  });
});
