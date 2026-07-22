/**
 * Godtier uniqueness gate: no two catalog templates may share the same
 * creative identity combination. Also audits the Template Creative Registry.
 *
 * Run: npm run lint:uniqueness
 *
 * Publishing threshold is enforced via PUBLISHING_UNIQUENESS_THRESHOLD.
 * ADMIN_UNIQUENESS_OVERRIDE_SLUGS may allowlist exceptions (internal only).
 */
import { CATALOG_TEMPLATES, type CatalogTemplate } from "../src/lib/invitation-mvp/catalogue";
import {
  ADMIN_UNIQUENESS_OVERRIDE_SLUGS,
  auditCreativeRegistryUniqueness,
  canPublishTemplateCreative,
  listTemplateCreativeProfiles,
  PUBLISHING_UNIQUENESS_THRESHOLD,
  scoreTemplateUniqueness,
} from "../src/lib/invitation/template-creative-registry";

const IDENTITY_DIMENSIONS = [
  "themeId",
  "blueprintId",
  "motifPackId",
  "motionProfileId",
  "buttonStyle",
] as const;

const EXPERIENCE_DIMENSIONS = [
  "introVariant",
  "openingExperience",
  "sceneTransition",
  "outroExperience",
  "typographyPackId",
  "slideshowStyle",
  "countdownStyle",
] as const;

function identityTuple(t: CatalogTemplate): string {
  const base = IDENTITY_DIMENSIONS.map((k) => `${k}=${t[k] ?? ""}`);
  const exp = EXPERIENCE_DIMENSIONS.map((k) => `${k}=${t.experienceOverrides?.[k] ?? ""}`);
  return [...base, ...exp].join("|");
}

function identityRichness(t: CatalogTemplate): number {
  const base = IDENTITY_DIMENSIONS.filter((k) => t[k]).length;
  const exp = EXPERIENCE_DIMENSIONS.filter((k) => t.experienceOverrides?.[k]).length;
  return base + exp;
}

let failures = 0;

// 1. Full-identity collisions among Studio 2.0 / godtier templates.
const seen = new Map<string, string>();
for (const t of CATALOG_TEMPLATES) {
  if (!t.themeId && !t.experienceOverrides) continue;
  const tuple = identityTuple(t);
  const clash = seen.get(tuple);
  if (clash) {
    failures += 1;
    console.error(`✗ IDENTICAL identity: "${t.slug}" duplicates "${clash}" — differentiate at least one dimension.`);
  } else {
    seen.set(tuple, t.slug);
  }
}

// 2. Flagship templates (with a creative brief) must carry a full identity.
for (const t of CATALOG_TEMPLATES) {
  if (!t.creativeBrief) continue;
  const richness = identityRichness(t);
  const minRichness = t.themeId ? 10 : 8; // cinematic pilots may lack Wave-1 theme tokens
  if (richness < minRichness) {
    failures += 1;
    console.error(
      `✗ "${t.slug}" has a creative brief but only ${richness}/${minRichness} identity dimensions set — flagship templates must define their full experience.`
    );
  }
  if (!t.experienceOverrides?.introVariant || !t.experienceOverrides?.openingExperience) {
    failures += 1;
    console.error(`✗ "${t.slug}" is missing a unique intro variant or opening experience.`);
  }
  if (!t.buttonStyle) {
    failures += 1;
    console.error(`✗ "${t.slug}" is missing a button family.`);
  }
}

// 3. No two flagships may share the same intro+opening ceremony pair.
{
  const used = new Map<string, string>();
  for (const t of CATALOG_TEMPLATES) {
    if (!t.creativeBrief) continue;
    const intro = t.experienceOverrides?.introVariant;
    const opening = t.experienceOverrides?.openingExperience;
    if (!intro || !opening) continue;
    const key = `${intro}|${opening}`;
    const clash = used.get(key);
    if (clash) {
      failures += 1;
      console.error(
        `✗ Flagships "${t.slug}" and "${clash}" share the same intro+opening pair ("${key}").`
      );
    } else {
      used.set(key, t.slug);
    }
  }
}

// 3b. Prefer unique introVariant among flagships (soft → hard when collision + same universe).
{
  const used = new Map<string, string>();
  for (const t of CATALOG_TEMPLATES) {
    const value = t.experienceOverrides?.introVariant;
    if (!t.creativeBrief || !value) continue;
    const clash = used.get(value);
    if (clash) {
      failures += 1;
      console.error(`✗ Flagships "${t.slug}" and "${clash}" share introVariant ("${value}").`);
    } else {
      used.set(value, t.slug);
    }
  }
}

// 3c. Prefer unique openingExperience among flagships (structural uniqueness — Phase 4).
{
  const used = new Map<string, string>();
  for (const t of CATALOG_TEMPLATES) {
    const value = t.experienceOverrides?.openingExperience;
    if (!t.creativeBrief || !value) continue;
    const clash = used.get(value);
    if (clash) {
      failures += 1;
      console.error(
        `✗ Flagships "${t.slug}" and "${clash}" share openingExperience ("${value}").`
      );
    } else {
      used.set(value, t.slug);
    }
  }
}

// 4. Creative Registry fingerprint collisions + publishing threshold.
const registryAudit = auditCreativeRegistryUniqueness(PUBLISHING_UNIQUENESS_THRESHOLD);
for (const c of registryAudit.collisions) {
  failures += 1;
  console.error(`✗ Registry fingerprint collision: "${c.a}" ≡ "${c.b}"`);
}
for (const f of registryAudit.failures) {
  failures += 1;
  console.error(
    `✗ Registry uniqueness below publishing threshold (${PUBLISHING_UNIQUENESS_THRESHOLD}): "${f.slug}" score=${f.report.score} — ${f.report.overlapping.join("; ")}`
  );
}

// 5. Per-SKU score report (fail hard below 40 even with override comments).
for (const p of listTemplateCreativeProfiles()) {
  const report = scoreTemplateUniqueness(p.catalogSlug);
  const publish = canPublishTemplateCreative(p.catalogSlug);
  const flag = CATALOG_TEMPLATES.find((t) => t.slug === p.catalogSlug)?.creativeBrief
    ? "flagship"
    : "catalog";
  if (report.score < 40) {
    failures += 1;
    console.error(`✗ "${p.catalogSlug}" uniqueness score ${report.score}/100 — ${report.overlapping.join("; ")}`);
  } else {
    const gate = publish.ok ? "publish-ok" : "publish-blocked";
    console.log(
      `· ${p.catalogSlug}: uniqueness ${report.score}/100 (${p.creativeUniverse}) [${flag}|${gate}]`
    );
  }
}

if (ADMIN_UNIQUENESS_OVERRIDE_SLUGS.size > 0) {
  console.log(
    `Admin uniqueness overrides active: ${[...ADMIN_UNIQUENESS_OVERRIDE_SLUGS].join(", ")}`
  );
}

// 6. Wedding flagships — full combo uniqueness among Wedding/Engagement creativeBriefs.
const WEDDING_CATEGORIES = new Set(["Wedding", "Engagement"]);
const weddingFlagships = CATALOG_TEMPLATES.filter(
  (t) => WEDDING_CATEGORIES.has(t.category) && t.creativeBrief && t.experienceOverrides
);
const weddingComboSeen = new Map<string, string>();
for (const t of weddingFlagships) {
  const profile = listTemplateCreativeProfiles().find((p) => p.catalogSlug === t.slug);
  const combo = [
    t.experienceOverrides?.openingExperience,
    t.experienceOverrides?.introVariant,
    profile?.motionProfile,
    t.experienceOverrides?.typographyPackId,
    t.buttonStyle,
    t.experienceOverrides?.slideshowStyle,
    profile?.defaultAudioTrack,
    t.experienceOverrides?.outroExperience,
  ].join("|");
  const clash = weddingComboSeen.get(combo);
  if (clash) {
    failures += 1;
    console.error(`✗ Wedding flagships "${t.slug}" and "${clash}" share the same full experience combo.`);
  } else {
    weddingComboSeen.set(combo, t.slug);
  }
}
console.log(`· Wedding flagships audited: ${weddingFlagships.length} unique experience combos`);

const flagshipCount = CATALOG_TEMPLATES.filter((t) => t.creativeBrief).length;
const registryCount = listTemplateCreativeProfiles().length;
if (failures > 0) {
  console.error(`\nTemplate uniqueness check failed with ${failures} problem(s).`);
  process.exit(1);
}
console.log(
  `Template uniqueness check passed — ${flagshipCount} flagship universes, ${seen.size} distinct catalog identities, ${registryCount} registry profiles, ${weddingFlagships.length} wedding flagships, publishing threshold ${PUBLISHING_UNIQUENESS_THRESHOLD}.`
);
