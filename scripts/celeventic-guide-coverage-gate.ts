#!/usr/bin/env tsx
/**
 * Celeventic Guide coverage acceptance gate (§60).
 * Exit 0 on PASS (0 unexplained P0/P1 MISSING). Writes docs/guides/celeventic-help-coverage.md.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  buildCoverageReport,
  coverageGatePasses,
  toCoverageMarkdown,
} from "../src/lib/celeventic-guide/coverage-matrix";

const report = buildCoverageReport();
const gate = coverageGatePasses(report);
const mdPath = join(process.cwd(), "docs/guides/celeventic-help-coverage.md");
mkdirSync(dirname(mdPath), { recursive: true });
writeFileSync(mdPath, toCoverageMarkdown(), "utf8");

console.log(
  JSON.stringify(
    {
      coveragePercent: report.coveragePercent,
      totalUserFacing: report.totalUserFacing,
      covered: report.covered,
      partial: report.partial,
      missing: report.missing,
      deprecatedOrNa: report.deprecatedOrNa,
      gate: gate.ok ? "PASS" : "FAIL",
      reason: gate.reason,
      matrixPath: "docs/guides/celeventic-help-coverage.md",
    },
    null,
    2
  )
);

if (!gate.ok) process.exit(1);
