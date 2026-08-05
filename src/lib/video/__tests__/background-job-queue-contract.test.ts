import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_PROCESS_QUEUE } from "@/lib/video/queues";

describe("VIDEO_PROCESS_QUEUE constant", () => {
  it("uses the canonical queue slug video-process", () => {
    assert.equal(VIDEO_PROCESS_QUEUE, "video-process");
  });
});

describe("BackgroundJob query contracts", () => {
  const files = [
    "src/lib/media/media-health.ts",
    "src/lib/video/worker-health.ts",
    "src/lib/job-handlers.ts",
    "src/lib/video/processing.ts",
    "src/lib/video/cleanup.ts",
  ];

  it("never filters BackgroundJob by obsolete Prisma field `type`", () => {
    for (const rel of files) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      assert.doesNotMatch(
        source,
        /backgroundJob\.[a-zA-Z]+\([\s\S]*?\btype:\s*["']video-process["']/,
        `${rel} must not query BackgroundJob.type`
      );
      assert.doesNotMatch(
        source,
        /where:\s*\{\s*type:\s*["']video-process["']/,
        `${rel} must not use where.type for video-process`
      );
    }
  });

  it("media-health counts PENDING and PROCESSING via queue", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/media/media-health.ts"), "utf8");
    assert.match(source, /VIDEO_PROCESS_QUEUE/);
    assert.match(source, /queue:\s*VIDEO_PROCESS_QUEUE/);
    assert.match(source, /status:\s*\{\s*in:\s*\[["']PENDING["'],\s*["']PROCESSING["']\]/);
    assert.doesNotMatch(source, /["']RUNNING["']/);
  });

  it("worker-health and job dispatch reuse VIDEO_PROCESS_QUEUE", () => {
    for (const rel of [
      "src/lib/video/worker-health.ts",
      "src/lib/job-handlers.ts",
      "src/lib/video/processing.ts",
      "src/lib/video/cleanup.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), rel), "utf8");
      assert.match(source, /VIDEO_PROCESS_QUEUE/);
      assert.doesNotMatch(source, /["']video-process["']/);
    }
  });
});
