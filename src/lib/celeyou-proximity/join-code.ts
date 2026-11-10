export function normalizeJoinCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

export function parseTapJoinScan(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "tap" && parts[1]) return normalizeJoinCode(parts[1]);
    const fromQuery = url.searchParams.get("code");
    if (fromQuery) return normalizeJoinCode(fromQuery);
  } catch {
    /* not a URL */
  }
  const compact = normalizeJoinCode(raw);
  if (compact.length >= 6) return compact;
  return null;
}
