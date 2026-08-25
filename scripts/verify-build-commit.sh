#!/usr/bin/env bash
# Compare git HEAD to /api/health build.commit after a Celeventic deploy.
# Usage: bash scripts/verify-build-commit.sh [expected_sha] [health_url]
# Exit 0 on match, 1 on mismatch, 2 on unreachable health.
set -euo pipefail

EXPECTED="${1:-$(git rev-parse HEAD)}"
HEALTH_URL="${2:-${HEALTH_LOCAL:-http://127.0.0.1:3001/api/health}}"

json="$(curl -fsS --max-time 15 "$HEALTH_URL")" || {
  printf '[verify-build-commit] ERROR: health unreachable: %s\n' "$HEALTH_URL" >&2
  exit 2
}

reported="$(
  node -e '
    const j = JSON.parse(process.argv[1]);
    const b = j.build || {};
    process.stdout.write(String(b.commit || b.shortCommit || ""));
  ' "$json"
)"

node -e '
  const expected = String(process.argv[1] || "").trim().toLowerCase();
  const reported = String(process.argv[2] || "").trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(expected)) {
    console.error("[verify-build-commit] ERROR: invalid expected SHA:", expected);
    process.exit(1);
  }
  if (!reported) {
    console.error("[verify-build-commit] FAIL: health.build.commit missing");
    process.exit(1);
  }
  const ok =
    expected === reported ||
    expected.startsWith(reported) ||
    reported.startsWith(expected) ||
    expected.slice(0, 12) === reported.slice(0, 12);
  if (!ok) {
    console.error(
      "[verify-build-commit] FAIL: git=" + expected + " health.commit=" + reported
    );
    process.exit(1);
  }
  console.log(
    "[verify-build-commit] OK: git=" + expected.slice(0, 12) + " health=" + reported.slice(0, 12)
  );
' "$EXPECTED" "$reported"
