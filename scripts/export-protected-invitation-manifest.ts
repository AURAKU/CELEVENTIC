/**
 * Exports docs/invitations/studio-3/protected-template-manifest.json
 * from the live catalogue + protection classifiers.
 *
 * Read-only. Does not touch production or modify templates.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  PROTECTED_TEMPLATE_SOURCE_PATHS,
  buildProtectedTemplateManifest,
  manifestSummary,
  mayModifyLayoutInPlace,
} from "../src/lib/invitation/studio3/protected-manifest";
import {
  DEFAULT_LAYOUT_VERSION,
  PROTECTED_LAYOUT_SLUGS,
} from "../src/lib/invitation/layout-version";

const entries = buildProtectedTemplateManifest();
const summary = manifestSummary(entries);
const layouts = [...new Set(entries.map((e) => e.layoutSlug))].sort();
const byLayout = layouts.map((layout) => {
  const skus = entries.filter((e) => e.layoutSlug === layout);
  const head = skus[0]!;
  return {
    layoutSlug: layout,
    status: head.status,
    upgradeEligibility: head.upgradeEligibility,
    risk: head.risk,
    catalogSkus: skus.map((s) => s.catalogSlug),
    evidence: head.evidence,
  };
});

const doc = {
  initiative: "CELEVENTIC — Invitation Experience 3.0",
  generatedAt: new Date().toISOString(),
  rules: {
    inPlaceEditsAllowed: mayModifyLayoutInPlace("any"),
    defaultLayoutVersion: DEFAULT_LAYOUT_VERSION,
    eligibleRequiresProductionProof: true,
    unknownTreatedAsProtected: true,
  },
  summary,
  protectedLayoutSlugs: [...PROTECTED_LAYOUT_SLUGS],
  protectedSourcePaths: [...PROTECTED_TEMPLATE_SOURCE_PATHS],
  layouts: byLayout,
  catalogEntries: entries,
};

const out = path.join(
  process.cwd(),
  "docs/invitations/studio-3/protected-template-manifest.json"
);
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${out}`);
console.log(summary);
