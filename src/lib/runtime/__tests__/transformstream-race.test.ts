import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRANSFORMSTREAM_RACE_FIXED_NODE,
  TRANSFORMSTREAM_RACE_MESSAGE,
  buildTransformStreamRaceDiagnostics,
  compareNodeVersions,
  formatTransformStreamRaceStartupWarning,
  isTransformStreamRaceError,
  nodeHasTransformStreamRaceFix,
  parseNodeVersion,
  probeTransformStreamCancelWriteRace,
} from "../transformstream-race";

describe("parseNodeVersion / compareNodeVersions", () => {
  it("parses v-prefixed versions", () => {
    assert.deepEqual(parseNodeVersion("v20.20.2"), { major: 20, minor: 20, patch: 2 });
  });

  it("orders versions correctly", () => {
    const a = parseNodeVersion("20.20.2")!;
    const b = parseNodeVersion("24.15.0")!;
    assert.ok(compareNodeVersions(a, b) < 0);
    assert.equal(compareNodeVersions(b, b), 0);
  });
});

describe("nodeHasTransformStreamRaceFix", () => {
  it("marks Node 20.20.2 and 22.22.1 as unfixed", () => {
    assert.equal(nodeHasTransformStreamRaceFix("v20.20.2"), false);
    assert.equal(nodeHasTransformStreamRaceFix("v22.22.1"), false);
  });

  it("marks Node 24.15.0+ as fixed", () => {
    assert.equal(nodeHasTransformStreamRaceFix("v24.15.0"), true);
    assert.equal(nodeHasTransformStreamRaceFix("v24.16.0"), true);
  });

  it("marks Node 25.8.1+ as fixed but not 25.8.0", () => {
    assert.equal(nodeHasTransformStreamRaceFix("v25.8.0"), false);
    assert.equal(nodeHasTransformStreamRaceFix("v25.8.1"), true);
  });
});

describe("isTransformStreamRaceError", () => {
  it("detects the exact production message", () => {
    assert.equal(isTransformStreamRaceError(new TypeError(TRANSFORMSTREAM_RACE_MESSAGE)), true);
    assert.equal(isTransformStreamRaceError(new Error("unrelated")), false);
  });
});

describe("buildTransformStreamRaceDiagnostics", () => {
  it("redacts token query params and includes runtime fields", () => {
    const err = new TypeError(TRANSFORMSTREAM_RACE_MESSAGE);
    (err as Error & { digest?: string }).digest = "3225108298";
    const d = buildTransformStreamRaceDiagnostics({
      error: err,
      requestPath: "/invite/abc?guestToken=supersecret&x=1",
      requestMethod: "GET",
      routePath: "/app/invite/[link]/page",
      routeType: "render",
      renderSource: "react-server-components",
      mediaUrl: "/api/uploads/invitations/u1/clip.mp4?token=abc",
    });
    assert.equal(d.kind, "transformstream_race");
    assert.equal(d.digest, "3225108298");
    assert.equal(d.requestMethod, "GET");
    assert.ok(!String(d.requestPath).includes("supersecret"));
    assert.ok(String(d.mediaUrl).includes("[redacted]") || !String(d.mediaUrl).includes("abc"));
    assert.equal(d.streamConstructors.TransformStream, "TransformStream");
    assert.ok(d.processVersion.startsWith("v"));
  });
});

describe("formatTransformStreamRaceStartupWarning", () => {
  it("warns on vulnerable Node and is silent on fixed Node", () => {
    assert.ok(formatTransformStreamRaceStartupWarning("v20.20.2")?.includes(TRANSFORMSTREAM_RACE_FIXED_NODE));
    assert.equal(formatTransformStreamRaceStartupWarning("v24.15.0"), null);
  });
});

describe("probeTransformStreamCancelWriteRace — Node runtime", () => {
  it("reports vulnerability consistent with Node version", async () => {
    const result = await probeTransformStreamCancelWriteRace(30);
    assert.equal(result.iterations, 30);
    assert.ok(result.processVersion.startsWith("v"));
    const parts = parseNodeVersion(result.processVersion);
    assert.ok(parts);

    if (nodeHasTransformStreamRaceFix(result.processVersion)) {
      assert.equal(result.hits, 0, `fixed Node must not hit race: ${result.processVersion}`);
      assert.equal(result.vulnerable, false);
      return;
    }

    // Node 20.x and 22.x reliably reproduce the cancel/write race (200/200 in local probes).
    // Older majors (e.g. 18) may not hit the same interleaving — do not require hits there.
    const knownVulnerable = parts.major === 20 || parts.major === 22;
    if (knownVulnerable) {
      assert.ok(
        result.hits > 0,
        `Node ${result.processVersion} should reproduce race (got ${result.hits}/${result.iterations})`
      );
      assert.equal(result.vulnerable, true);
    } else {
      assert.equal(typeof result.vulnerable, "boolean");
    }
  });
});

describe("no global stream polyfill", () => {
  it("uses native TransformStream / ReadableStream constructors", () => {
    assert.equal(typeof TransformStream, "function");
    assert.equal(typeof ReadableStream, "function");
    const ts = new TransformStream();
    assert.ok(ts.readable instanceof ReadableStream);
    assert.ok(ts.writable instanceof WritableStream);
    // Must not be a polyfill package name.
    assert.equal(TransformStream.name, "TransformStream");
  });
});
