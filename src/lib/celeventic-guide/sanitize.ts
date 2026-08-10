/** Strip HTML / script-like content from guide text fields. No raw HTML in UI. */
export function sanitizeGuideText(input: unknown, maxLen = 8000): string {
  const raw = String(input ?? "");
  const noTags = raw
    .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[\s\S]*?>[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
  return noTags.replace(/\u0000/g, "").trim().slice(0, maxLen);
}

export function sanitizeGuideSlug(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function parseJsonStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => sanitizeGuideText(v, 200)).filter(Boolean);
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => sanitizeGuideText(v, 200)).filter(Boolean);
  } catch {
    return [];
  }
}

export function toJsonStringArray(values: string[]): string {
  return JSON.stringify(
    values.map((v) => sanitizeGuideText(v, 200)).filter(Boolean).slice(0, 40)
  );
}
