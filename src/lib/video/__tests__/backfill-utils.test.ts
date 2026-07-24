import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toPosixRelative,
  parseInvitationUploadPath,
  isBackfillCandidatePath,
  buildOldUrlCandidates,
  buildProcessedRelativePaths,
  deepReplaceUrlsInJson,
  manifestEntryIsUpToDate,
  buildReplacementMap,
  createEmptyManifest,
  type BackfillManifestEntry,
} from "../backfill-utils";

describe("toPosixRelative", () => {
  it("strips leading slashes and normalizes separators", () => {
    assert.equal(toPosixRelative("/invitations/u1/a.mov"), "invitations/u1/a.mov");
    assert.equal(toPosixRelative("invitations/u1/a.mov"), "invitations/u1/a.mov");
  });
});

describe("parseInvitationUploadPath", () => {
  it("extracts userId, fileName, and extension from a well-formed path", () => {
    const info = parseInvitationUploadPath("invitations/user123/1700000000-abcd.mov");
    assert.ok(info);
    assert.equal(info?.userId, "user123");
    assert.equal(info?.fileName, "1700000000-abcd.mov");
    assert.equal(info?.extension, "mov");
  });

  it("handles nested subpaths (e.g. originals/processed subdirectories)", () => {
    const info = parseInvitationUploadPath("invitations/user123/originals/1700000000-original.mov");
    assert.ok(info);
    assert.equal(info?.userId, "user123");
    assert.equal(info?.fileName, "1700000000-original.mov");
  });

  it("returns null for paths outside invitations/", () => {
    assert.equal(parseInvitationUploadPath("templates/asset.mov"), null);
  });

  it("returns null for a bare invitations/ path with no user segment", () => {
    assert.equal(parseInvitationUploadPath("invitations/onlyfile.mov"), null);
  });
});

describe("isBackfillCandidatePath", () => {
  it("accepts a raw MOV directly under a user directory", () => {
    assert.equal(isBackfillCandidatePath("invitations/user1/1700-abc.mov"), true);
  });

  it("accepts a raw MP4 (HEVC could be inside — must still probe/convert)", () => {
    assert.equal(isBackfillCandidatePath("invitations/user1/1700-abc.mp4"), true);
  });

  it("rejects images", () => {
    assert.equal(isBackfillCandidatePath("invitations/user1/1700-abc.jpg"), false);
  });

  it("rejects files already inside a processed/ directory (our own output)", () => {
    assert.equal(isBackfillCandidatePath("invitations/user1/processed/1700-uuid-playback.mp4"), false);
  });

  it("rejects files already inside an originals/ directory (private archival copy)", () => {
    assert.equal(isBackfillCandidatePath("invitations/user1/originals/1700-original.mov"), false);
  });

  it("rejects files matching our own generated suffixes even outside processed/ (defence in depth)", () => {
    assert.equal(isBackfillCandidatePath("invitations/user1/1700-abc-playback.mp4"), false);
    assert.equal(isBackfillCandidatePath("invitations/user1/1700-abc-poster.jpg"), false);
  });

  it("rejects paths outside the invitations/ root", () => {
    assert.equal(isBackfillCandidatePath("vendors/user1/clip.mov"), false);
  });
});

describe("buildOldUrlCandidates", () => {
  it("returns every historical URL shape for a relative path", () => {
    const candidates = buildOldUrlCandidates("invitations/user1/clip.mov");
    assert.deepEqual(candidates, [
      "/api/uploads/invitations/user1/clip.mov",
      "/uploads/invitations/user1/clip.mov",
      "invitations/user1/clip.mov",
    ]);
  });
});

describe("buildProcessedRelativePaths", () => {
  it("places outputs under a per-user processed/ directory with a shared base id", () => {
    const paths = buildProcessedRelativePaths("user1", "1700-uuid");
    assert.equal(paths.playback, "invitations/user1/processed/1700-uuid-playback.mp4");
    assert.equal(paths.poster, "invitations/user1/processed/1700-uuid-poster.jpg");
    assert.equal(paths.thumbnail, "invitations/user1/processed/1700-uuid-thumbnail.jpg");
  });
});

describe("deepReplaceUrlsInJson", () => {
  const replacements = buildReplacementMap(
    ["/api/uploads/invitations/u1/clip.mov", "/uploads/invitations/u1/clip.mov"],
    "/api/uploads/invitations/u1/processed/xyz-playback.mp4"
  );

  it("replaces an exact-match string value anywhere in a nested object", () => {
    const input = {
      hero: { url: "/api/uploads/invitations/u1/clip.mov", type: "video" },
      other: "unchanged",
    };
    const { value, changed, replacements: count } = deepReplaceUrlsInJson(input, replacements);
    assert.equal(changed, true);
    assert.equal(count, 1);
    assert.deepEqual(value, {
      hero: { url: "/api/uploads/invitations/u1/processed/xyz-playback.mp4", type: "video" },
      other: "unchanged",
    });
  });

  it("replaces a URL embedded as a substring of a longer (e.g. absolute) string", () => {
    const input = "https://www.celeventic.com/api/uploads/invitations/u1/clip.mov?v=2";
    const { value, changed } = deepReplaceUrlsInJson(input, replacements);
    assert.equal(changed, true);
    assert.equal(value, "https://www.celeventic.com/api/uploads/invitations/u1/processed/xyz-playback.mp4?v=2");
  });

  it("walks arrays and replaces matches inside them", () => {
    const input = { media: ["/uploads/invitations/u1/clip.mov", "/api/uploads/invitations/u1/other.jpg"] };
    const { value, changed } = deepReplaceUrlsInJson(input, replacements);
    assert.equal(changed, true);
    assert.deepEqual(value, {
      media: ["/api/uploads/invitations/u1/processed/xyz-playback.mp4", "/api/uploads/invitations/u1/other.jpg"],
    });
  });

  it("is a no-op (changed=false) when nothing matches", () => {
    const input = { a: 1, b: "no urls here", c: [true, null] };
    const { value, changed, replacements: count } = deepReplaceUrlsInJson(input, replacements);
    assert.equal(changed, false);
    assert.equal(count, 0);
    assert.deepEqual(value, input);
  });

  it("never mutates the input value", () => {
    const input = { url: "/api/uploads/invitations/u1/clip.mov" };
    const frozenCopy = JSON.parse(JSON.stringify(input));
    deepReplaceUrlsInJson(input, replacements);
    assert.deepEqual(input, frozenCopy);
  });

  it("handles primitives (null, number, boolean) without throwing", () => {
    assert.deepEqual(deepReplaceUrlsInJson(null, replacements).value, null);
    assert.deepEqual(deepReplaceUrlsInJson(42, replacements).value, 42);
    assert.deepEqual(deepReplaceUrlsInJson(true, replacements).value, true);
  });
});

describe("buildReplacementMap", () => {
  it("skips candidates equal to the new URL (would be a no-op replacement)", () => {
    const map = buildReplacementMap(["/a", "/b"], "/b");
    assert.equal(map.has("/a"), true);
    assert.equal(map.has("/b"), false);
  });

  it("skips empty-string candidates", () => {
    const map = buildReplacementMap(["", "/a"], "/new");
    assert.equal(map.size, 1);
    assert.equal(map.get("/a"), "/new");
  });
});

describe("manifestEntryIsUpToDate / createEmptyManifest", () => {
  it("a fresh manifest has no entries", () => {
    const manifest = createEmptyManifest();
    assert.equal(Object.keys(manifest.entries).length, 0);
    assert.equal(manifest.version, 1);
  });

  it("returns false when there is no prior entry", () => {
    assert.equal(manifestEntryIsUpToDate(undefined, 100, 12345), false);
  });

  it("returns true only when status is terminal-success and size+mtime both match", () => {
    const entry: BackfillManifestEntry = {
      relativePath: "invitations/u1/clip.mov",
      userId: "u1",
      status: "DONE",
      sourceSizeBytes: 100,
      sourceMtimeMs: 12345,
    };
    assert.equal(manifestEntryIsUpToDate(entry, 100, 12345), true);
    assert.equal(manifestEntryIsUpToDate(entry, 100, 99999), false, "mtime changed — file was replaced");
    assert.equal(manifestEntryIsUpToDate(entry, 999, 12345), false, "size changed — file was replaced");
  });

  it("treats SKIPPED_COMPATIBLE as terminal (already verified compatible, no re-check needed)", () => {
    const entry: BackfillManifestEntry = {
      relativePath: "invitations/u1/clip.mp4",
      userId: "u1",
      status: "SKIPPED_COMPATIBLE",
      sourceSizeBytes: 50,
      sourceMtimeMs: 1,
    };
    assert.equal(manifestEntryIsUpToDate(entry, 50, 1), true);
  });

  it("does not treat FAILED or PENDING as up-to-date (must retry)", () => {
    const failed: BackfillManifestEntry = {
      relativePath: "invitations/u1/clip.mov",
      userId: "u1",
      status: "FAILED",
      sourceSizeBytes: 50,
      sourceMtimeMs: 1,
    };
    assert.equal(manifestEntryIsUpToDate(failed, 50, 1), false);
  });
});
