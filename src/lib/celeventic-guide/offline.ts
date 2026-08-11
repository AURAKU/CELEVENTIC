/**
 * Safe offline cache for public Celeventic Guide content only.
 * Never stores invite tokens, guest PII, admission codes, or private URLs.
 */

import { guideStorageKey } from "./tour-storage";

export type OfflineGuideSnapshot = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  transcript: string;
  steps: Array<{ title: string; body: string; stepType: string }>;
  posterUrl: string | null;
  savedAt: number;
};

const INDEX_KEY = guideStorageKey("offline", "index");
const MAX_CACHED = 12;

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, MAX_CACHED) : [];
  } catch {
    return [];
  }
}

function writeIndex(slugs: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(slugs.slice(0, MAX_CACHED)));
}

export function listOfflineGuideSlugs(): string[] {
  return readIndex();
}

export function getOfflineGuide(slug: string): OfflineGuideSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(guideStorageKey("offline-guide", slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineGuideSnapshot;
    if (!parsed?.slug || parsed.slug !== slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGuideForOffline(input: OfflineGuideSnapshot): { ok: boolean; reason?: string } {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };
  try {
    const safe: OfflineGuideSnapshot = {
      slug: String(input.slug).replace(/[^a-z0-9-]/gi, "").slice(0, 120),
      title: String(input.title ?? "").slice(0, 200),
      summary: String(input.summary ?? "").slice(0, 500),
      body: String(input.body ?? "").slice(0, 8000),
      transcript: String(input.transcript ?? "").slice(0, 12000),
      posterUrl:
        input.posterUrl && String(input.posterUrl).startsWith("/guides/")
          ? String(input.posterUrl).slice(0, 300)
          : null,
      steps: (input.steps ?? []).slice(0, 40).map((s) => ({
        title: String(s.title ?? "").slice(0, 200),
        body: String(s.body ?? "").slice(0, 2000),
        stepType: String(s.stepType ?? "motion").slice(0, 40),
      })),
      savedAt: Date.now(),
    };
    if (!safe.slug) return { ok: false, reason: "invalid-slug" };
    localStorage.setItem(guideStorageKey("offline-guide", safe.slug), JSON.stringify(safe));
    const index = readIndex().filter((s) => s !== safe.slug);
    index.unshift(safe.slug);
    writeIndex(index);
    return { ok: true };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export function removeOfflineGuide(slug: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(guideStorageKey("offline-guide", slug));
    writeIndex(readIndex().filter((s) => s !== slug));
  } catch {
    /* ignore */
  }
}
