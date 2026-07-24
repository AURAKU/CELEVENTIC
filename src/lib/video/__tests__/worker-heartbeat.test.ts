import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Pure filesystem tests — no DB needed — for the worker liveness heartbeat. */

let stateDir: string;

before(async () => {
  stateDir = await mkdtemp(path.join(os.tmpdir(), "celeventic-heartbeat-unit-test-"));
  process.env.VIDEO_WORKER_HEARTBEAT_DIR = stateDir;
});

after(async () => {
  await rm(stateDir, { recursive: true, force: true }).catch(() => {});
  delete process.env.VIDEO_WORKER_HEARTBEAT_DIR;
  delete process.env.VIDEO_WORKER_HEARTBEAT_STALE_MS;
});

beforeEach(async () => {
  await rm(stateDir, { recursive: true, force: true }).catch(() => {});
});

describe("worker-heartbeat", () => {
  it("reports not alive when no heartbeat has ever been written", async () => {
    const { isWorkerAlive, readWorkerHeartbeat } = await import("../worker-heartbeat");
    assert.equal(await readWorkerHeartbeat(), null);
    assert.equal(await isWorkerAlive(), false);
  });

  it("reports alive immediately after writing a heartbeat", async () => {
    const { writeWorkerHeartbeat, isWorkerAlive, readWorkerHeartbeat } = await import("../worker-heartbeat");
    await writeWorkerHeartbeat();
    const beat = await readWorkerHeartbeat();
    assert.ok(beat);
    assert.equal(typeof beat!.pid, "number");
    assert.equal(await isWorkerAlive(), true);
  });

  it("reports not alive once the heartbeat is older than the stale threshold", async () => {
    process.env.VIDEO_WORKER_HEARTBEAT_STALE_MS = "50";
    const { writeWorkerHeartbeat, isWorkerAlive } = await import("../worker-heartbeat");
    await writeWorkerHeartbeat();
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(await isWorkerAlive(), false);
    delete process.env.VIDEO_WORKER_HEARTBEAT_STALE_MS;
  });
});
