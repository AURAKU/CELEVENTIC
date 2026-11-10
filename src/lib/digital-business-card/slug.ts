import { isDemoCardSlug, isDemoCourtesySlug } from "./demo-card";

const WEAK_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "co",
  "ltd",
  "llc",
  "inc",
  "senior",
  "junior",
  "lead",
  "head",
  "chief",
  "principal",
  "assistant",
  "associate",
]);

const ROUTE_SLUGS = new Set([
  "admin",
  "api",
  "c",
  "card",
  "cards",
  "claim",
  "create",
  "demo",
  "edit",
  "n",
  "new",
  "preview",
  "present",
  "studio",
]);

export function slugifyDigitalCardBase(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Keep a trailing hyphen while the owner is still typing. */
export function constrainDigitalCardSlugInput(raw: string): string {
  const keepTail = /-$/.test(raw);
  const next = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 48);
  return keepTail ? next : next.replace(/-+$/, "");
}

export function isProtectedDigitalCardSlug(slug: string): boolean {
  const value = slugifyDigitalCardBase(slug);
  if (!value) return true;
  if (ROUTE_SLUGS.has(value)) return true;
  return isDemoCardSlug(value) || isDemoCourtesySlug(value);
}

function firstDistinctToken(value: string, used: Set<string>): string {
  const token =
    slugifyDigitalCardBase(value)
      .split("-")
      .find((part) => part.length >= 2 && !WEAK_WORDS.has(part) && !used.has(part)) || "";
  return token;
}

export type DigitalCardSlugSeed = {
  preferred?: string | null;
  displayName?: string | null;
  company?: string | null;
  title?: string | null;
};

export function digitalCardSlugCandidates(seed: DigitalCardSlugSeed): string[] {
  const name = slugifyDigitalCardBase(seed.displayName || "");
  const preferred = slugifyDigitalCardBase(seed.preferred || "");
  const used = new Set(name.split("-").filter(Boolean));
  const company = firstDistinctToken(seed.company || "", used);
  if (company) used.add(company);
  const role = firstDistinctToken(seed.title || "", used);
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (value: string) => {
    const slug = slugifyDigitalCardBase(value).slice(0, 48);
    if (!slug || seen.has(slug) || isProtectedDigitalCardSlug(slug)) return;
    seen.add(slug);
    out.push(slug);
  };

  if (preferred) push(preferred);
  if (name) push(name);
  if (name && company) push(`${name}-${company}`);
  if (name && role) push(`${name}-${role}`);
  if (!out.length) push(preferred || name || "card");
  if (!out.length) out.push("card");
  return out;
}

export function pickAvailableDigitalCardSlug(
  candidates: string[],
  taken: (slug: string) => boolean
): string {
  for (const candidate of candidates) {
    if (!taken(candidate) && !isProtectedDigitalCardSlug(candidate)) return candidate;
  }
  const base = (candidates.find((item) => !isProtectedDigitalCardSlug(item)) || "card").slice(0, 44);
  for (let n = 2; n < 1000; n += 1) {
    const next = `${base}-${n}`;
    if (!taken(next) && !isProtectedDigitalCardSlug(next)) return next;
  }
  return `${base}-${Date.now().toString(36).slice(-6)}`;
}
