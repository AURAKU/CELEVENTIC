#!/usr/bin/env node
/**
 * CI backstop for Invitation Studio 2.0 token purity: no literal colors in the
 * invitation page/viewer sources (including CSS, which eslint doesn't parse).
 * Theme tokens live only in src/lib/invitation-theme/.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/components/invitation-pages", "src/components/invitation-paged"];
const EXTENSIONS = [".ts", ".tsx", ".css"];
const PATTERNS = [
  { re: /#[0-9a-fA-F]{3,8}\b/, label: "hex color" },
  { re: /\brgba?\(/, label: "rgb()/rgba() color" },
  { re: /\bhsla?\(/, label: "hsl()/hsla() color" },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.some((ext) => full.endsWith(ext))) yield full;
  }
}

let failures = 0;
for (const root of ROOTS) {
  let files;
  try {
    files = [...walk(root)];
  } catch {
    continue; // directory not created yet
  }
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const { re, label } of PATTERNS) {
        if (re.test(line)) {
          failures += 1;
          console.error(`✗ ${relative(process.cwd(), file)}:${i + 1} — literal ${label}: ${line.trim().slice(0, 80)}`);
        }
      }
    });
  }
}

if (failures > 0) {
  console.error(`\nToken purity check failed: ${failures} literal color(s). Use var(--inv-*) tokens.`);
  process.exit(1);
}
console.log("Token purity check passed — invitation pages are token-pure.");
