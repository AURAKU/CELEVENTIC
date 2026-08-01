/**
 * CLI probe for the Node TransformStream cancel/write race.
 * Exit 0 when fixed (or when CELEVENTIC_ALLOW_TRANSFORMSTREAM_RACE=1).
 * Exit 2 when vulnerable and not allowed.
 */
const { setTimeout } = require("node:timers/promises");

const MESSAGE = "controller[kState].transformAlgorithm is not a function";

function parse(v) {
  const m = String(v).replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function gte(a, b) {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

function hasFix(version) {
  const p = parse(version);
  if (!p) return false;
  if (p.major > 24) return gte(p, parse("25.8.1"));
  return gte(p, parse("24.15.0"));
}

async function attempt() {
  const stream = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
    },
  });
  await setTimeout(0);
  const reader = stream.readable.getReader();
  const writer = stream.writable.getWriter();
  const pendingRead = reader.read();
  await setTimeout(0);
  const pendingCancel = reader.cancel(new Error("probe-cancel"));
  const pendingLateWrite = writer.write(new Uint8Array([1, 2, 3]));
  const results = await Promise.allSettled([pendingRead, pendingCancel, pendingLateWrite]);
  return results.some(
    (r) => r.status === "rejected" && String(r.reason && r.reason.message).includes(MESSAGE)
  );
}

async function main() {
  const iterations = Number(process.env.TRANSFORMSTREAM_PROBE_ITERS || 40);
  let hits = 0;
  for (let i = 0; i < iterations; i++) {
    if (await attempt()) hits += 1;
  }
  const report = {
    processVersion: process.version,
    iterations,
    hits,
    vulnerable: hits > 0,
    nodeHasFixClaim: hasFix(process.version),
    fixedAt: ">=24.15.0 or >=25.8.1",
  };
  console.log(JSON.stringify(report, null, 2));

  if (hits === 0) {
    console.log("[probe] OK — no TransformStream controller race detected.");
    return;
  }

  console.error(
    `[probe] VULNERABLE — ${hits}/${iterations} hits on ${process.version}. ` +
      `Upgrade Celeventic to Node >= 24.15.0. See docs/ops/TRANSFORMSTREAM-RACE.md`
  );

  if (process.env.CELEVENTIC_ALLOW_TRANSFORMSTREAM_RACE === "1") {
    console.warn("[probe] CELEVENTIC_ALLOW_TRANSFORMSTREAM_RACE=1 — continuing anyway.");
    return;
  }
  process.exitCode = 2;
}

main().catch((err) => {
  console.error("[probe] failed", err);
  process.exitCode = 1;
});
