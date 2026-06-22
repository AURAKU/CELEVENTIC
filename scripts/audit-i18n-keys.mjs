import fs from "fs";
import path from "path";
import { DEFAULT_TRANSLATIONS } from "../src/lib/i18n/default-translations.ts";

const keys = new Set(DEFAULT_TRANSLATIONS.map((r) => `${r.namespace}.${r.key}`));
const used = new Set();
const re = /t\(["']([a-zA-Z0-9_.]+)["']/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      let match;
      while ((match = re.exec(source))) used.add(match[1]);
    }
  }
}

walk(path.join(process.cwd(), "src"));

const missing = [...used].filter((k) => !keys.has(k)).sort();
console.log(`Used keys: ${used.size}`);
console.log(`Defined keys: ${keys.size}`);
console.log(`Missing: ${missing.length}`);
if (missing.length) {
  console.log(missing.join("\n"));
  process.exitCode = 1;
}
